"use client";

import AppLayout from "@/components/AppLayout";
import {
  getCompanySettings, updateCompanySettings,
  getPlantContacts, upsertPlantContact,
} from "@/app/actions";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, ChevronDown, ChevronUp, Globe, Mail, MapPin, MessageSquare, Plus, Save, Trash2 } from "lucide-react";

type CompanySettings = Awaited<ReturnType<typeof getCompanySettings>>;

// ─── TagInput ────────────────────────────────────────────────────────────────
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
            <div key={i} className="flex items-center justify-between border border-[var(--sg-line)] bg-[var(--sg-canvas)] px-3 py-1.5">
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

// ─── SaveButton ───────────────────────────────────────────────────────────────
function SaveBtn({ saving, saved, onClick, label = "Guardar" }: {
  saving: boolean; saved: boolean; onClick: () => void; label?: string;
}) {
  return (
    <motion.button type="button" onClick={onClick} disabled={saving} whileTap={{ scale: 0.98 }}
      className={`sg-btn ${saved ? "sg-btn-primary" : "sg-btn-accent"} w-full justify-center h-10 ${saving ? "opacity-70" : ""}`}>
      {saved
        ? <><CheckCircle2 className="h-4 w-4" /> Guardado</>
        : saving
        ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
            <Save className="h-4 w-4" />
          </motion.span>
        : <><Save className="h-4 w-4" /> {label}</>
      }
    </motion.button>
  );
}

// ─── PlantSection ─────────────────────────────────────────────────────────────
function PlantSection({ companyId, planta, initial }: {
  companyId: string; planta: string;
  initial: { emails: string[]; phones: string[] };
}) {
  const [open,   setOpen]   = useState(false);
  const [emails, setEmails] = useState(initial.emails);
  const [phones, setPhones] = useState(initial.phones);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const total = emails.length + phones.length;

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
        <div className="flex items-center gap-3 min-w-0">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">{planta}</span>
          <span className="flex items-center gap-2 text-[var(--sg-muted)] hidden sm:flex">
            <Mail className="h-3 w-3" />
            <span className="sg-font-mono text-[9px]">{emails.length}</span>
            <MessageSquare className="h-3 w-3 ml-1" />
            <span className="sg-font-mono text-[9px]">{phones.length}</span>
          </span>
          {total > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sg-success)] shrink-0" />
          )}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[var(--sg-muted)] shrink-0" />
               : <ChevronDown className="h-3.5 w-3.5 text-[var(--sg-muted)] shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 border-t border-[var(--sg-line)] grid gap-4">
              <p className="text-[10px] text-[var(--sg-muted)]">
                Solo reciben alertas cuando el incidente ocurre en <strong className="text-[var(--sg-copy)]">{planta}</strong>.
              </p>
              <TagInput label="Correos" placeholder="guardia@empresa.com" type="email"
                items={emails} onChange={setEmails} />
              <TagInput label="WhatsApp" placeholder="51987654321"
                items={phones} onChange={setPhones} hint="Sin + ni espacios" />
              <SaveBtn saving={saving} saved={saved} onClick={handleSave} label={`Guardar ${planta}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmpresaPage() {
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [company,        setCompany]        = useState<CompanySettings>(null);
  const [plantData,      setPlantData]      = useState<{ planta: string; emails: string[]; phones: string[] }[]>([]);
  const [globalEmails,   setGlobalEmails]   = useState<string[]>([]);
  const [globalPhones,   setGlobalPhones]   = useState<string[]>([]);
  const [plantas,        setPlantas]        = useState("");
  const [alertaMinutos,  setAlertaMinutos]  = useState(45);

  useEffect(() => {
    getCompanySettings().then(data => {
      if (data) {
        setCompany(data);
        setGlobalEmails(data.notification_emails ?? []);
        setGlobalPhones(data.notification_phones ?? []);
        setPlantas((data.plantas ?? []).join(", "));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAlertaMinutos((data as any).alerta_minutos ?? 45);
        getPlantContacts(data.id).then(setPlantData);
      }
      setLoading(false);
    });
  }, []);

  const handleSaveGlobal = async () => {
    setSaving(true);
    await updateCompanySettings({ notificationEmails: globalEmails, notificationPhones: globalPhones, plantas, alertaMinutos });
    if (company?.id) getPlantContacts(company.id).then(setPlantData);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const plantasList = plantas.split(",").map(p => p.trim()).filter(Boolean);

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {company?.logo_url
              ? <Image unoptimized width={48} height={48} src={company.logo_url} alt="Logo" className="h-12 w-12 shrink-0 object-contain border border-[var(--sg-line)] bg-white p-0.5" />
              : <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] sg-font-display text-[18px] font-bold text-[var(--sg-accent)]">
                  {company?.name?.[0] ?? "?"}
                </div>
            }
            <div>
              <div className="sg-kicker mb-0.5">Mi Empresa</div>
              <h1 className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                {company?.name ?? "—"}
              </h1>
              <p className="sg-font-mono text-[10px] text-[var(--sg-muted)] uppercase tracking-widest">
                {company?.sector ?? ""} · {plantasList.length} sede{plantasList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-64 animate-pulse bg-[var(--sg-panel-2)]" />)}
        </div>
      ) : !company ? (
        <div className="sg-panel p-8 text-center text-[var(--sg-muted)] sg-font-mono text-[11px] uppercase tracking-widest">
          No hay empresa configurada
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* ── Columna izquierda: Global ─────────────────────────────── */}
          <div className="sg-panel p-6 grid gap-5">
            <div className="flex items-center gap-2 border-b border-[var(--sg-line)] pb-4">
              <Globe className="h-4 w-4 text-[var(--sg-accent)]" />
              <div>
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Alertas globales</div>
                <p className="text-[10px] text-[var(--sg-muted)]">Reciben alertas de todas las sedes</p>
              </div>
            </div>

            <TagInput label="Correos" placeholder="supervisor@empresa.com" type="email"
              items={globalEmails} onChange={setGlobalEmails} />
            <TagInput label="WhatsApp" placeholder="51987654321"
              items={globalPhones} onChange={setGlobalPhones} hint="Sin + ni espacios" />

            <div className="sg-field">
              <label className="sg-label">Sedes / Garitas</label>
              <input type="text" value={plantas} onChange={e => setPlantas(e.target.value)}
                className="sg-input text-[12px]" placeholder="Lomas, Cajamarquilla, Planta Norte" />
              <p className="text-[10px] text-[var(--sg-muted)]">Separadas por coma</p>
            </div>

            <div className="sg-field">
              <label className="sg-label flex items-center gap-2">
                Umbral de alerta proactiva
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={alertaMinutos}
                  onChange={e => setAlertaMinutos(Math.min(240, Math.max(15, Number(e.target.value))))}
                  className="sg-input w-24 text-center sg-font-mono"
                />
                <span className="text-[12px] text-[var(--sg-copy)]">minutos</span>
              </div>
              <p className="text-[10px] text-[var(--sg-muted)]">
                Se envía alerta si el vehículo lleva más de este tiempo esperando (mín. 15, máx. 240)
              </p>
            </div>

            <SaveBtn saving={saving} saved={saved} onClick={handleSaveGlobal} label="Guardar globales" />
          </div>

          {/* ── Columna derecha: Por sede ─────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--sg-accent)]" />
              <div>
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Alertas por sede</div>
                <p className="text-[10px] text-[var(--sg-muted)]">Cada guardia solo recibe alertas de su garita</p>
              </div>
            </div>

            {plantasList.length === 0 ? (
              <div className="sg-panel p-6 text-center text-[var(--sg-muted)] sg-font-mono text-[10px] uppercase tracking-widest">
                Agrega sedes en la columna izquierda
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {plantasList.map(planta => {
                  const existing = plantData.find(p => p.planta === planta);
                  return (
                    <PlantSection key={planta} companyId={company.id} planta={planta}
                      initial={{ emails: existing?.emails ?? [], phones: existing?.phones ?? [] }} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
