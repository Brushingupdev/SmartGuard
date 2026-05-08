"use client";

import AppLayout from "@/components/AppLayout";
import {
  getAdminOverview, adminUpdateCompanySettings,
  getPlantContacts, upsertPlantContact,
} from "@/app/actions";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bell, Building2, CheckCircle2, ChevronDown, ChevronUp,
  Clock, CreditCard, Eye, Globe, MapPin, Plus, Save, Trash2, Users,
} from "lucide-react";
import { adminUpdatePlan } from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";

type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
type AdminCompany = NonNullable<AdminOverview>["companies"][number];
type PlantContact = Awaited<ReturnType<typeof getPlantContacts>>[number];
type CompanyPlan = "trial" | "active" | "suspended";

interface CompanyBilling {
  plan: CompanyPlan | null;
  trial_ends_at: string | null;
}

interface ActivityStat {
  label: string;
  value: string | number;
  sub?: string;
}

function TagInput({ label, placeholder, items, onChange, type = "text", hint }: {
  label: string; placeholder: string; hint?: string;
  items: string[]; onChange: (v: string[]) => void; type?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setInput("");
  };
  return (
    <div className="sg-field">
      <label className="sg-label">{label}</label>
      <div className="flex gap-2 mb-2">
        <input type={type} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); }}}
          placeholder={placeholder} className="sg-input flex-1 text-[12px]" />
        <button type="button" onClick={add} className="sg-btn sg-btn-primary sg-btn-sm shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5">
              <span className="sg-font-mono text-[11px] text-[var(--sg-copy)] truncate">{item}</span>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="ml-2 shrink-0 text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hint && <p className="text-[10px] text-[var(--sg-muted)] mt-1">{hint}</p>}
    </div>
  );
}

function PlantSection({ companyId, planta, initial }: {
  companyId: string; planta: string;
  initial: { emails: string[]; phones: string[] };
}) {
  const [open, setOpen]     = useState(false);
  const [emails, setEmails] = useState(initial.emails);
  const [phones, setPhones] = useState(initial.phones);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await upsertPlantContact({ companyId, planta, emails, phones });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className={`border transition-colors ${open ? "border-[var(--sg-accent)]" : "border-[var(--sg-line)]"}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--sg-panel-2)] transition-colors">
        <div className="flex items-center gap-3">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">{formatGateLabelFromPlant(planta)}</span>
          <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">{emails.length}✉ · {phones.length}📱</span>
          {(emails.length + phones.length) > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[var(--sg-success)]" />}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[var(--sg-muted)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--sg-muted)]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 border-t border-[var(--sg-line)] grid gap-4">
              <TagInput label="Correos" placeholder="guardia@empresa.com" type="email" items={emails} onChange={setEmails} />
              <TagInput label="WhatsApp" placeholder="51987654321" items={phones} onChange={setPhones} hint="Sin + ni espacios" />
              <motion.button type="button" onClick={handleSave} disabled={saving} whileTap={{ scale: 0.98 }}
                className={`sg-btn ${saved ? "sg-btn-primary" : "sg-btn-accent"} sg-btn-sm self-start`}>
                {saved ? <><CheckCircle2 className="h-3.5 w-3.5" />Guardado</>
                  : saving ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><Save className="h-3.5 w-3.5" /></motion.span>
                  : <><Save className="h-3.5 w-3.5" />Guardar sede</>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [plantData, setPlantData] = useState<PlantContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const [globalEmails, setGlobalEmails] = useState<string[]>([]);
  const [globalPhones, setGlobalPhones] = useState<string[]>([]);
  const [plantas, setPlantas]           = useState("");
  const [contactName, setContactName]   = useState("");

  // Billing
  const [plan,         setPlan]         = useState<"trial"|"active"|"suspended">("trial");
  const [trialEndsAt,  setTrialEndsAt]  = useState("");
  const [savingPlan,   setSavingPlan]   = useState(false);
  const [savedPlan,    setSavedPlan]    = useState(false);

  useEffect(() => {
    getAdminOverview().then(data => {
      const c = data?.companies.find(c => c.id === id);
      if (c) {
        setCompany(c);
        getPlantContacts(id).then(setPlantData);
        // Fetch billing
        import("@/utils/supabase/client").then(({ createClient: createBrowserClient }) => {
          const bc = createBrowserClient();
          bc.from("companies").select("plan, trial_ends_at").eq("id", id).single()
            .then(({ data: bd }) => {
              if (bd) {
                const billing = bd as CompanyBilling | null;
                if (billing) {
                  setPlan(billing.plan ?? "trial");
                  setTrialEndsAt(billing.trial_ends_at ?? "");
                }
              }
            });
        });
        // Fetch full settings
        import("@/utils/supabase/client").then(({ createClient }) => {
          const client = createClient();
          client.from("companies")
            .select("notification_emails, notification_phones, plantas, contact_name")
            .eq("id", id)
            .single()
            .then(({ data: s }) => {
              if (s) {
                setGlobalEmails(s.notification_emails ?? []);
                setGlobalPhones(s.notification_phones ?? []);
                setPlantas((s.plantas ?? []).join(", "));
                setContactName(s.contact_name ?? "");
              }
            });
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await adminUpdateCompanySettings(id, {
      contactName, notificationEmails: globalEmails,
      notificationPhones: globalPhones, plantas,
    });
    getPlantContacts(id).then(setPlantData);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const plantasList = plantas.split(",").map(p => p.trim()).filter(Boolean);

  if (loading) return (
    <AppLayout>
      <div className="flex flex-col gap-4 max-w-4xl">
        {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse bg-[var(--sg-panel-2)]" />)}
      </div>
    </AppLayout>
  );

  if (!company) return (
    <AppLayout>
      <div className="sg-panel p-10 text-center text-[var(--sg-muted)] sg-font-mono text-[11px] uppercase tracking-widest">
        Empresa no encontrada
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 border-b border-[var(--sg-line)] pb-5">
        <button onClick={() => router.push("/admin")}
          className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a empresas
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {company.logoUrl
              ? <Image unoptimized width={56} height={56} src={company.logoUrl} alt={company.name} className="h-14 w-14 shrink-0 object-contain border border-[var(--sg-line)] bg-white p-0.5" />
              : <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] sg-font-display text-[22px] font-bold text-[var(--sg-accent)]">
                  {company.name[0]}
                </div>
            }
            <div>
              <div className="sg-kicker mb-0.5">Detalle de empresa</div>
              <h1 className="sg-font-display text-[24px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">{company.name}</h1>
              <p className="sg-font-mono text-[10px] text-[var(--sg-muted)] uppercase tracking-widest">{company.sector}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const { startImpersonation } = await import("@/app/actions/companies");
              await startImpersonation(id);
              router.push("/dashboard");
            }}
            className="flex items-center gap-2 border border-[var(--sg-accent)] bg-[var(--sg-panel-2)] px-4 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver como supervisor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users,    label: "Usuarios",      value: company.users,        sub: `${company.guardias}g · ${company.supervisors}s` },
          { icon: Building2,label: "Sedes",          value: company.plantas.length, sub: company.plantas.map((p: string) => formatGateLabelFromPlant(p)).join(" · ") || "Sin configurar" },
          { icon: Clock,    label: "Total registros",value: company.totalRecords.toLocaleString(), sub: `+${company.recentRecords} últimos 30 días` },
          { icon: Bell,     label: "Alertas config.", value: company.hasContacts ? "✓ Ok" : "✗ Falta", sub: company.hasContacts ? "Email y/o WhatsApp" : "Sin contactos" },
        ].map(stat => (
          <div key={stat.label} className="sg-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="h-4 w-4 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">{stat.label}</span>
            </div>
            <div className="sg-font-mono text-[24px] font-bold text-[var(--sg-ink)] leading-none">{stat.value}</div>
            <div className="text-[10px] text-[var(--sg-muted)] mt-1 truncate">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Billing */}
      <div className="sg-panel p-6 mb-6">
        <div className="flex items-center gap-2 border-b border-[var(--sg-line)] pb-4 mb-5">
          <CreditCard className="h-4 w-4 text-[var(--sg-accent)]" />
          <div>
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Plan y facturación</div>
            <p className="text-[10px] text-[var(--sg-muted)]">Gestión del plan de acceso</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="sg-field">
            <label className="sg-label">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value as CompanyPlan)} className="sg-select">
              <option value="trial">Trial</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          {plan === "trial" && (
            <div className="sg-field">
              <label className="sg-label">Fecha fin de prueba</label>
              <input type="date" value={trialEndsAt} onChange={e => setTrialEndsAt(e.target.value)}
                className="sg-input" style={{ colorScheme: "dark" }} />
            </div>
          )}
          <motion.button
            onClick={async () => {
              setSavingPlan(true);
              await adminUpdatePlan({ companyId: id, plan, trialEndsAt: trialEndsAt || undefined });
              setSavingPlan(false); setSavedPlan(true);
              setTimeout(() => setSavedPlan(false), 2500);
            }}
            disabled={savingPlan}
            whileTap={{ scale: 0.98 }}
            className={`sg-btn ${savedPlan ? "sg-btn-primary" : "sg-btn-accent"} h-10 self-end ${savingPlan ? "opacity-70" : ""}`}
          >
            {savedPlan ? <><CheckCircle2 className="h-4 w-4" />Guardado</>
              : savingPlan ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><Save className="h-4 w-4" /></motion.span>
              : <><Save className="h-4 w-4" />Guardar plan</>}
          </motion.button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 border px-3 py-1 sg-font-mono text-[10px] uppercase tracking-widest ${
            plan === "active" ? "border-[var(--sg-success)] text-[var(--sg-success)]"
            : plan === "suspended" ? "border-[var(--sg-danger)] text-[var(--sg-danger)]"
            : "border-[var(--sg-warn)] text-[var(--sg-warn)]"
          }`}>
            {plan === "active" ? "● Activo" : plan === "suspended" ? "● Suspendido" : `● Trial${trialEndsAt ? ` · hasta ${trialEndsAt}` : ""}`}
          </span>
        </div>
      </div>

      {/* Config grid */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Alertas globales */}
        <div className="sg-panel p-6 grid gap-5">
          <div className="flex items-center gap-2 border-b border-[var(--sg-line)] pb-4">
            <Globe className="h-4 w-4 text-[var(--sg-accent)]" />
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Configuración global</div>
              <p className="text-[10px] text-[var(--sg-muted)]">Contacto y alertas de toda la empresa</p>
            </div>
          </div>

          <div className="sg-field">
            <label className="sg-label">Contacto principal</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="sg-input" placeholder="Nombre del responsable" />
          </div>
          <TagInput label="Correos globales" placeholder="supervisor@empresa.com" type="email" items={globalEmails} onChange={setGlobalEmails} />
          <TagInput label="WhatsApp globales" placeholder="51987654321" items={globalPhones} onChange={setGlobalPhones} hint="Sin + ni espacios" />
          <div className="sg-field">
            <label className="sg-label">Sedes / Garitas</label>
            <input type="text" value={plantas} onChange={e => setPlantas(e.target.value)} className="sg-input" placeholder="Lomas, Cajamarquilla, Planta Norte" />
            <p className="text-[10px] text-[var(--sg-muted)]">Separadas por coma</p>
          </div>

          <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale: 0.98 }}
            className={`sg-btn ${saved ? "sg-btn-primary" : "sg-btn-accent"} w-full justify-center h-11 ${saving ? "opacity-70" : ""}`}>
            {saved ? <><CheckCircle2 className="h-4 w-4" />Guardado</>
              : saving ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><Save className="h-4 w-4" /></motion.span>
              : <><Save className="h-4 w-4" />Guardar</>}
          </motion.button>
        </div>

        {/* Por sede */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--sg-accent)]" />
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Alertas por sede</div>
              <p className="text-[10px] text-[var(--sg-muted)]">Contactos específicos por garita</p>
            </div>
          </div>
          {plantasList.length === 0
            ? <div className="sg-panel p-6 text-center text-[var(--sg-muted)] sg-font-mono text-[10px] uppercase tracking-widest">Configura sedes en la columna izquierda</div>
            : plantasList.map(planta => {
                const existing = plantData.find(p => p.planta === planta);
                return <PlantSection key={planta} companyId={id} planta={planta}
                  initial={{ emails: existing?.emails ?? [], phones: existing?.phones ?? [] }} />;
              })
          }
        </div>
      </div>

      {/* Activity Stats */}
      {!loading && company && (
        <div className="mt-8 border-t border-[var(--sg-line)] pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center bg-[var(--sg-panel-2)] text-[var(--sg-accent)]">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="sg-font-display text-[16px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Actividad
              </h3>
              <p className="text-[11px] text-[var(--sg-muted)]">Resumen de uso de la plataforma</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {([
              { label: "Total registros", value: company.totalRecords.toLocaleString() },
              { label: "Últimos 30 días", value: company.recentRecords > 0 ? `+${company.recentRecords}` : "0" },
              { label: "Última actividad", value: company.lastActivity ? new Date(company.lastActivity + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
              { label: "Usuarios", value: company.users, sub: `${company.guardias}g · ${company.supervisors}s` },
            ] satisfies ActivityStat[]).map((stat) => (
              <div key={stat.label} className="sg-panel p-4">
                <div className="sg-font-mono text-[24px] font-bold text-[var(--sg-ink)]">{stat.value}</div>
                <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mt-1">{stat.label}</div>
                {stat.sub && <div className="text-[10px] text-[var(--sg-muted)] mt-0.5">{stat.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
