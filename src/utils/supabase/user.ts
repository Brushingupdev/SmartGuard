import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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
    // Validate target company exists
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data: target } = await admin.from("companies")
      .select("id")
      .eq("id", impersonateCookie.value)
      .maybeSingle();

    if (!target) {
      // Target deleted — clear cookie and return normal admin context
      cookieStore.set("sg_impersonate", "", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
      });
    } else {
      return {
        userId: user.id,
        role: "supervisor",
        companyId: impersonateCookie.value,
        isAdmin: false,
        plant: "",
        isImpersonating: true,
        isReadOnly: true,
      };
    }
  }

  return {
    userId: user.id,
    role: realRole,
    companyId: realIsAdmin
      ? null
      : (user.user_metadata?.company_id as string | undefined) ?? null,
    isAdmin: realIsAdmin,
    plant: (user.user_metadata?.plant as string) ?? "",
    isImpersonating: false,
    isReadOnly: false,
  };
}
