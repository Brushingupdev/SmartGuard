"use server";

import { requireAdmin, nowLima } from "./_helpers";

export interface PaymentRow {
  id: string;
  companyId: string;
  companyName: string;
  amount: number;
  currency: string;
  periodMonths: number;
  plan: string;
  notes: string | null;
  registeredBy: string | null;
  createdAt: string;
}

export interface PendingCompany {
  id: string;
  name: string;
  plan: string;
  trialEndsAt: string | null;
  daysLeft: number | null;
  expired: boolean;
}

// ─── Registrar pago ──────────────────────────────────────────────────────────
// Crea el registro de pago y actualiza el plan de la empresa.
// Si periodMonths > 0, extiende el acceso desde hoy por ese número de meses.

export async function registerPayment(data: {
  companyId: string;
  amount: number;
  currency?: string;
  periodMonths: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  // Calcular nueva fecha de vencimiento desde hoy
  const { date: today } = nowLima();
  const newExpiry = new Date(today);
  newExpiry.setMonth(newExpiry.getMonth() + data.periodMonths);
  const newExpiryStr = newExpiry.toISOString().split("T")[0];

  // 1. Registrar el pago
  const { error: paymentError } = await admin.from("payments").insert({
    company_id:    data.companyId,
    amount:        data.amount,
    currency:      data.currency ?? "PEN",
    period_months: data.periodMonths,
    plan:          "active",
    notes:         data.notes ?? null,
    registered_by: "admin",
  });

  if (paymentError) return { success: false, error: paymentError.message };

  // 2. Activar plan de la empresa
  const { error: companyError } = await admin
    .from("companies")
    .update({
      plan: "active",
      trial_ends_at: newExpiryStr,
    })
    .eq("id", data.companyId);

  if (companyError) return { success: false, error: companyError.message };

  return { success: true };
}

// ─── Obtener todos los pagos ─────────────────────────────────────────────────

export async function getPayments(): Promise<PaymentRow[]> {
  if (!(await requireAdmin())) return [];

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { data } = await admin
    .from("payments")
    .select("*, companies(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map(p => ({
    id:            p.id as string,
    companyId:     p.company_id as string,
    companyName:   (p.companies as { name: string } | null)?.name ?? "—",
    amount:        p.amount as number,
    currency:      p.currency as string,
    periodMonths:  p.period_months as number,
    plan:          p.plan as string,
    notes:         p.notes as string | null,
    registeredBy:  p.registered_by as string | null,
    createdAt:     p.created_at as string,
  }));
}

// ─── Empresas pendientes de pago ─────────────────────────────────────────────
// Devuelve empresas con trial vencido o por vencer en los próximos 14 días.

export async function getPendingPayments(): Promise<PendingCompany[]> {
  if (!(await requireAdmin())) return [];

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { date: today } = nowLima();
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);
  const in14DaysStr = in14Days.toISOString().split("T")[0];

  const { data } = await admin
    .from("companies")
    .select("id, name, plan, trial_ends_at")
    .is("deleted_at", null)
    .or(`plan.eq.trial,plan.eq.suspended`)
    .lte("trial_ends_at", in14DaysStr)
    .order("trial_ends_at", { ascending: true });

  return (data ?? []).map(c => {
    const trialEndsAt = c.trial_ends_at as string | null;
    let daysLeft: number | null = null;
    let expired = false;
    if (trialEndsAt) {
      daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - new Date(today).getTime()) / 86_400_000);
      if (daysLeft < 0) expired = true;
    }
    return {
      id:          c.id as string,
      name:        c.name as string,
      plan:        c.plan as string,
      trialEndsAt,
      daysLeft,
      expired,
    };
  });
}

// ─── Pagos por empresa ───────────────────────────────────────────────────────

export async function getPaymentsByCompany(companyId: string): Promise<PaymentRow[]> {
  if (!(await requireAdmin())) return [];

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { data } = await admin
    .from("payments")
    .select("*, companies(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(p => ({
    id:           p.id as string,
    companyId:    p.company_id as string,
    companyName:  (p.companies as { name: string } | null)?.name ?? "—",
    amount:       p.amount as number,
    currency:     p.currency as string,
    periodMonths: p.period_months as number,
    plan:         p.plan as string,
    notes:        p.notes as string | null,
    registeredBy: p.registered_by as string | null,
    createdAt:    p.created_at as string,
  }));
}
