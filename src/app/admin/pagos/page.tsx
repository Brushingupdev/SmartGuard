"use client";

import AppLayout from "@/components/AppLayout";
import { getPayments, getPendingPayments, registerPayment } from "@/app/actions/payments";
import { getCompanies } from "@/app/actions/companies";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, ChevronLeft,
  CreditCard, DollarSign, Plus, RefreshCw, X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

type PaymentRow     = Awaited<ReturnType<typeof getPayments>>[number];
type PendingCompany = Awaited<ReturnType<typeof getPendingPayments>>[number];

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toFixed(2)}`;
}

function UrgencyBadge({ daysLeft, expired }: { daysLeft: number | null; expired: boolean }) {
  if (expired) return (
    <span className="sg-badge sg-badge-deny">Vencido</span>
  );
  if (daysLeft !== null && daysLeft <= 3) return (
    <span className="sg-badge sg-badge-deny">{daysLeft}d</span>
  );
  if (daysLeft !== null && daysLeft <= 7) return (
    <span className="sg-badge sg-badge-warn">{daysLeft}d</span>
  );
  return (
    <span className="sg-badge sg-badge-muted">{daysLeft}d</span>
  );
}

// ─── Register Payment Modal ───────────────────────────────────────────────────

function RegisterPaymentModal({
  companies,
  preselectedId,
  onSave,
  onCancel,
}: {
  companies: { id: string; name: string }[];
  preselectedId?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [companyId,     setCompanyId]     = useState(preselectedId ?? "");
  const [amount,        setAmount]        = useState("");
  const [currency,      setCurrency]      = useState("PEN");
  const [periodMonths,  setPeriodMonths]  = useState("1");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const handleSave = async () => {
    if (!companyId || !amount || parseFloat(amount) <= 0) {
      setError("Selecciona una empresa e ingresa un monto válido.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await registerPayment({
      companyId,
      amount:       parseFloat(amount),
      currency,
      periodMonths: parseInt(periodMonths),
      notes:        notes || undefined,
    });
    setSaving(false);
    if (result.success) onSave();
    else setError(result.error ?? "Error al registrar el pago.");
  };

  const selectedCompany = companies.find(c => c.id === companyId);
  const expiryPreview = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + parseInt(periodMonths || "1"));
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ ease: easeOut }}
        className="w-full max-w-[480px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <CreditCard className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Registrar pago
          </span>
          <button onClick={onCancel} className="ml-auto text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">

          {/* Empresa */}
          <div className="sg-field">
            <label className="sg-label">Empresa *</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="sg-select">
              <option value="">Seleccionar empresa</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="sg-field">
              <label className="sg-label">Monto *</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="sg-input pl-10"
                />
              </div>
            </div>
            <div className="sg-field">
              <label className="sg-label">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="sg-select">
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          {/* Período */}
          <div className="sg-field">
            <label className="sg-label">Período de acceso</label>
            <select value={periodMonths} onChange={e => setPeriodMonths(e.target.value)} className="sg-select">
              <option value="1">1 mes</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses (anual)</option>
            </select>
          </div>

          {/* Preview de activación */}
          {companyId && amount && (
            <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)] mt-0.5 shrink-0" />
              <div>
                <p className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-success)] mb-0.5">
                  Resultado del registro
                </p>
                <p className="text-[12px] text-[var(--sg-copy)]">
                  <strong className="text-[var(--sg-ink)]">{selectedCompany?.name}</strong> pasará a plan{" "}
                  <strong className="text-[var(--sg-success)]">Activo</strong> con acceso hasta el{" "}
                  <strong className="text-[var(--sg-ink)]">{expiryPreview}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="sg-field">
            <label className="sg-label">Notas <span className="normal-case text-[var(--sg-muted)]">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Método de pago, referencia de transferencia, etc."
              className="sg-textarea"
              rows={2}
            />
          </div>

          {error && (
            <p className="text-[12px] text-[var(--sg-danger)] flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !companyId || !amount}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-50"
            >
              {saving
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Registrando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Registrar pago</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const [payments,    setPayments]    = useState<PaymentRow[]>([]);
  const [pending,     setPending]     = useState<PendingCompany[]>([]);
  const [companies,   setCompanies]   = useState<{ id: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [preselected, setPreselected] = useState<string | undefined>();
  const [toast,       setToast]       = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: "", ok: true });

  const showToast = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const load = useCallback(async () => {
    const [p, pend, comp] = await Promise.all([
      getPayments(),
      getPendingPayments(),
      getCompanies(),
    ]);
    setPayments(p);
    setPending(pend);
    setCompanies(comp);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getPayments(),
      getPendingPayments(),
      getCompanies(),
    ]).then(([p, pend, comp]) => {
      if (!active) return;
      setPayments(p);
      setPending(pend);
      setCompanies(comp);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSaved = async () => {
    setShowModal(false);
    setPreselected(undefined);
    showToast("Pago registrado. Plan activado correctamente.");
    await load();
  };

  const openForCompany = (id: string) => {
    setPreselected(id);
    setShowModal(true);
  };

  // Stats
  const thisMonth = new Date();
  const monthStr  = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthPayments = payments.filter(p => p.createdAt.startsWith(monthStr));
  const monthTotal    = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const expiredCount  = pending.filter(p => p.expired).length;
  const soonCount     = pending.filter(p => !p.expired).length;

  return (
    <AppLayout>
      <AnimatePresence>
        {showModal && (
          <RegisterPaymentModal
            companies={companies}
            preselectedId={preselected}
            onSave={handleSaved}
            onCancel={() => { setShowModal(false); setPreselected(undefined); }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 border-b border-[var(--sg-line)] pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors mb-2"
          >
            <ChevronLeft className="h-3 w-3" /> Panel admin
          </Link>
          <div className="sg-kicker mb-1">Facturación</div>
          <h1 className="sg-font-display text-[26px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Pagos y activaciones
          </h1>
          <p className="text-[12px] text-[var(--sg-muted)] mt-1">
            Registra pagos manualmente y activa el plan de cada cliente
          </p>
        </div>
        <button
          onClick={() => { setPreselected(undefined); setShowModal(true); }}
          className="flex items-center gap-2 border border-[var(--sg-accent)] px-4 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar pago
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Cobrado este mes",
            value: loading ? "—" : `S/ ${monthTotal.toFixed(2)}`,
            sub: `${monthPayments.length} pago${monthPayments.length !== 1 ? "s" : ""}`,
            color: monthTotal > 0 ? "var(--sg-success)" : undefined,
          },
          {
            label: "Total cobrado",
            value: loading ? "—" : `S/ ${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}`,
            sub: `${payments.length} registros`,
            color: "var(--sg-accent)",
          },
          {
            label: "Trials vencidos",
            value: loading ? "—" : expiredCount,
            sub: "Requieren acción inmediata",
            color: expiredCount > 0 ? "var(--sg-danger)" : undefined,
          },
          {
            label: "Por vencer",
            value: loading ? "—" : soonCount,
            sub: "Próximos 14 días",
            color: soonCount > 0 ? "var(--sg-warn)" : undefined,
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="sg-panel p-5 flex flex-col gap-1 relative overflow-hidden">
            {color && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />}
            <div className="sg-font-mono text-[28px] font-bold text-[var(--sg-ink)] leading-none">{value}</div>
            <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mt-1">{label}</div>
            {sub && <div className="text-[10px] text-[var(--sg-muted)]">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Pendientes */}
      {!loading && pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-4 w-4 text-[var(--sg-warn)]" />
            <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-warn)]">
              Requieren atención ({pending.length})
            </span>
          </div>
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[600px]">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Urgencia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c, i) => (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, ease: easeOut }}
                    className={c.expired ? "bg-[rgba(211,92,79,0.04)]" : ""}
                  >
                    <td>
                      <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                        {c.name}
                      </span>
                    </td>
                    <td>
                      <span className={`sg-badge ${c.expired ? "sg-badge-deny" : "sg-badge-warn"}`}>
                        {c.expired ? "Trial vencido" : "Trial activo"}
                      </span>
                    </td>
                    <td className="sg-font-mono text-[11px] text-[var(--sg-muted)]">
                      {c.trialEndsAt ? formatDate(c.trialEndsAt) : "—"}
                    </td>
                    <td>
                      <UrgencyBadge daysLeft={c.daysLeft} expired={c.expired} />
                    </td>
                    <td>
                      <button
                        onClick={() => openForCompany(c.id)}
                        className="flex items-center gap-1.5 border border-[var(--sg-accent)] px-3 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors"
                      >
                        <CreditCard className="h-3 w-3" /> Registrar pago
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="h-4 w-4 text-[var(--sg-muted)]" />
          <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
            Historial de pagos
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse bg-[var(--sg-panel-2)]" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="sg-panel p-12 text-center">
            <CreditCard className="h-10 w-10 text-[var(--sg-muted)] opacity-20 mx-auto mb-4" />
            <p className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
              Aún no hay pagos registrados
            </p>
          </div>
        ) : (
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[700px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empresa</th>
                  <th>Monto</th>
                  <th>Período</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <td className="sg-font-mono text-[11px] text-[var(--sg-muted)]">
                      {formatDate(p.createdAt)}
                    </td>
                    <td>
                      <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                        {p.companyName}
                      </span>
                    </td>
                    <td>
                      <span className="sg-font-mono text-[13px] font-bold text-[var(--sg-success)]">
                        {formatCurrency(p.amount, p.currency)}
                      </span>
                    </td>
                    <td className="sg-font-mono text-[11px] text-[var(--sg-copy)]">
                      {p.periodMonths} {p.periodMonths === 1 ? "mes" : "meses"}
                    </td>
                    <td className="text-[12px] text-[var(--sg-muted)] max-w-[200px] truncate">
                      {p.notes ?? "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            className="fixed bottom-6 right-6 z-[70] border bg-[var(--sg-panel)] px-5 py-4 shadow-[6px_6px_0_rgba(196,192,180,0.08)]"
            style={{ borderColor: toast.ok ? "var(--sg-success)" : "var(--sg-danger)" }}
          >
            <div className="flex items-center gap-3 text-sm text-[var(--sg-ink)]">
              <CheckCircle2 className="h-5 w-5" style={{ color: toast.ok ? "var(--sg-success)" : "var(--sg-danger)" }} />
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
