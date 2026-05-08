import { createClient } from "@/utils/supabase/server";
import { normalizeGateAssignments, type GateAssignment } from "@/lib/gates";
import { cookies } from "next/headers";
import { verifyValue } from "@/utils/cookie-signing";

// ──────────────────────────────────────────────────────────────────────────────
// UserContext — extracted from Supabase auth user metadata
//
// Roles: "administrador" | "supervisor" | "guardia"
// Default: "guardia" (least privilege)
//
// IMPORTANT: Role detection is STRICTLY based on user.user_metadata.role.
// There is NO email-based fallback. If metadata.role is missing, the user
// defaults to "guardia". This prevents accidental privilege escalation.
//
// Sync: auth.users → public.user_profiles is handled by trigger
// trg_sync_user_profile (see migration 20260501090000).
//
// Impersonation: When an admin visits a company-specific view, the cookie
// "sg_impersonate" holds the target companyId. getUserContext detects it,
// overrides the context (companyId = target, isAdmin = false, role = "supervisor")
// and sets isImpersonating = true + isReadOnly = true.
// ──────────────────────────────────────────────────────────────────────────────

export interface UserContext {
  userId: string;
  role: string;
  companyId: string | null;
  isAdmin: boolean;
  plant: string;
  plants: string[];
  gates: GateAssignment[];
  isImpersonating: boolean;
  isReadOnly: boolean;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const metaRole = user.user_metadata?.role as string | undefined;
  const realRole = metaRole ?? "guardia";
  const realIsAdmin = realRole === "administrador";

  // Check impersonation cookie (only valid for admins)
  const cookieStore = await cookies();
  const impersonateCookie = cookieStore.get("sg_impersonate");

  if (impersonateCookie?.value && realIsAdmin) {
    const secret = process.env.IMPERSONATE_COOKIE_SECRET;
    const companyId = secret ? verifyValue(impersonateCookie.value, secret) : null;

    const clearCookie = () => cookieStore.set("sg_impersonate", "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });

    if (!companyId) {
      // Signature invalid or secret not configured — clear and fall through
      clearCookie();
    } else {
      // Validate target company exists
      const { createAdminClient } = await import("@/utils/supabase/admin");
      const admin = createAdminClient();
      const { data: target } = await admin.from("companies")
        .select("id")
        .eq("id", companyId)
        .maybeSingle();

      if (!target) {
        clearCookie();
      } else {
        return {
          userId: user.id,
          role: "supervisor",
          companyId,
          isAdmin: false,
          plant: "",
          plants: [],
          gates: [],
          isImpersonating: true,
          isReadOnly: true,
        };
      }
    }
  }

  const metadataPlant = (user.user_metadata?.plant as string | undefined) ?? "";
  const assignedPlants = Array.isArray(user.user_metadata?.assigned_plants)
    ? (user.user_metadata.assigned_plants as unknown[]).filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : metadataPlant ? [metadataPlant] : [];
  const assignedGates = normalizeGateAssignments(user.user_metadata?.assigned_gates, assignedPlants);

  return {
    userId: user.id,
    role: realRole,
    companyId: realIsAdmin
      ? null
      : (user.user_metadata?.company_id as string | undefined) ?? null,
    isAdmin: realIsAdmin,
    plant: metadataPlant,
    plants: assignedPlants,
    gates: assignedGates,
    isImpersonating: false,
    isReadOnly: false,
  };
}
