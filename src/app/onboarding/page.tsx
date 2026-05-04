"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Building2, Upload, CheckCircle2, Eye, EyeOff, X,
  ShieldCheck, Users, FileText, FileSpreadsheet, RefreshCw, AlertCircle, UserPlus, Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { registerCompany } from "./actions";
import OnboardingPreview from "@/components/OnboardingPreview";
import { useProgressSaver } from "@/lib/useProgressSaver";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
type ProgressState = NonNullable<ReturnType<typeof useProgressSaver>["saved"]>;
type SaveProgressInput = Parameters<ReturnType<typeof useProgressSaver>["save"]>[0];
type ExcelCell = string | number | boolean | Date | null | undefined;
type ExcelRow = ExcelCell[];
type ExcelMapping = Record<string, string | null>;

interface ImportedExcelRow {
  fecha: string;
  anio: number;
  mes_num: number;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  razon_social: string;
  empresa: string | null;
  planta: string | null;
  tipo: string;
  tipo_operacion: string | null;
  responsable: string | null;
  agente: string | null;
  espera_min: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  segmento_orden: number;
  es_demora: number;
  observacion: string | null;
}

const SECTORS = [
  "Manufactura", "Logística y Distribución", "Minería", "Construcción",
  "Agroindustria", "Alimentos y Bebidas", "Química e Industrial", "Otro",
];

const STEP_LABELS = [
  { icon: Building2,       label: "Empresa"   },
  { icon: ShieldCheck,     label: "Acceso"    },
  { icon: Users,           label: "Personal"  },
  { icon: UserPlus,        label: "Guardias"  },
  { icon: FileSpreadsheet, label: "Datos"     },
  { icon: CheckCircle2,    label: "Confirmar" },
];

// ─── Excel field definitions ─────────────────────────────────────────────────

const PLATFORM_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: "fecha",            label: "Fecha",                   required: true  },
  { key: "h_registro",       label: "Hora de registro",        required: false },
  { key: "razon_social",     label: "Razón Social / Vehículo", required: true  },
  { key: "empresa",          label: "Empresa Destino",         required: false },
  { key: "planta",           label: "Planta / Garita",         required: false },
  { key: "tipo",             label: "Tipo (Prov./Propio)",     required: false },
  { key: "tipo_operacion",   label: "Tipo de Operación",       required: false },
  { key: "responsable",      label: "Responsable Almacén",     required: false },
  { key: "agente",           label: "Agente / Guardia",        required: false },
  { key: "h_atencion",       label: "H. Atención",             required: false },
  { key: "h_dev_docs",       label: "H. Dev. Documentos",      required: false },
  { key: "espera_min",       label: "Espera (min)",            required: false },
  { key: "tiempo_total_min", label: "Tiempo Total (min)",      required: false },
  { key: "observacion",      label: "Observación",             required: false },
];

// ─── Excel parsing helpers ────────────────────────────────────────────────────

function normalizeStr(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function autoDetectMapping(headers: string[]): Record<string, string | null> {
  const norm = headers.map(normalizeStr);
  const findCol = (patterns: string[]): string | null => {
    for (let i = 0; i < norm.length; i++) {
      for (const p of patterns) {
        if (norm[i].includes(p)) return headers[i];
      }
    }
    return null;
  };
  return {
    fecha:            findCol(["fecha", "date"]),
    h_registro:       findCol(["hregistro", "llegada", "horaregistro", "hentrada", "hora"]),
    razon_social:     findCol(["razonsocial", "razon", "transportista", "vehiculo", "unidad"]),
    empresa:          findCol(["empresadestino", "empresa", "cliente", "destino"]),
    planta:           findCol(["planta", "sede", "garita"]),
    tipo:             findCol(["tipo"]),
    tipo_operacion:   findCol(["tipooperacion", "operacion"]),
    responsable:      findCol(["responsable", "almacen"]),
    agente:           findCol(["agente", "guardia"]),
    h_atencion:       findCol(["hatencion", "atencion"]),
    h_dev_docs:       findCol(["hdevdocs", "docs", "documentos"]),
    espera_min:       findCol(["esperamin", "espera", "tiempoespera"]),
    tiempo_total_min: findCol(["tiempototal", "total", "duracion"]),
    observacion:      findCol(["observacion", "obs", "nota"]),
  };
}

function parseExcelDate(val: ExcelCell): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") {
    const ddmm = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
    const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return val.substring(0, 10);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }
  return null;
}

function parseExcelTime(val: ExcelCell): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const totalSec = Math.round(val * 86400);
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (typeof val === "string") {
    const m = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] ?? "00").padStart(2, "0")}`;
  }
  return null;
}

function transformRow(
  rawRow: ExcelRow,
  headers: string[],
  mapping: ExcelMapping,
): ImportedExcelRow | null {
  const colIdx: Record<string, number> = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const get = (field: string): ExcelCell | null => {
    const col = mapping[field];
    if (!col || colIdx[col] === undefined) return null;
    const v = rawRow[colIdx[col]];
    return v === "" ? null : v ?? null;
  };

  const fecha = parseExcelDate(get("fecha"));
  const razon_social = get("razon_social") ? String(get("razon_social")).toUpperCase().trim() : null;
  if (!fecha || !razon_social) return null;

  const espera_raw   = get("espera_min");
  const total_raw    = get("tiempo_total_min");
  const espera_min   = espera_raw !== null ? Math.round(parseFloat(String(espera_raw))) : null;
  const tiempo_total_min = total_raw !== null ? Math.round(parseFloat(String(total_raw))) : null;

  let segmento_espera: string | null = null;
  let segmento_orden = 0;
  let es_demora = 0;
  if (espera_min !== null && !isNaN(espera_min)) {
    if (espera_min >= 90)      { segmento_espera = "🔴 > 90 min";  segmento_orden = 4; es_demora = 1; }
    else if (espera_min >= 45) { segmento_espera = "🟠 45-90 min"; segmento_orden = 3; es_demora = 1; }
    else if (espera_min >= 30) { segmento_espera = "🟡 30-45 min"; segmento_orden = 2; es_demora = 1; }
    else                       { segmento_espera = "🟢 < 30 min";  segmento_orden = 1; }
  }

  const d = new Date(fecha);
  return {
    fecha,
    anio: d.getFullYear(),
    mes_num: d.getMonth() + 1,
    h_registro:       parseExcelTime(get("h_registro")),
    h_atencion:       parseExcelTime(get("h_atencion")),
    h_dev_docs:       parseExcelTime(get("h_dev_docs")),
    razon_social,
    empresa:          get("empresa") ? String(get("empresa")).toUpperCase().trim() : null,
    planta:           get("planta")  ? String(get("planta")).trim() : null,
    tipo:             get("tipo")    ? String(get("tipo")).trim() : "Proveedor",
    tipo_operacion:   get("tipo_operacion") ? String(get("tipo_operacion")).trim() : null,
    responsable:      get("responsable") ? String(get("responsable")).trim() : null,
    agente:           get("agente")  ? String(get("agente")).trim() : null,
    espera_min:       isNaN(espera_min as number) ? null : espera_min,
    tiempo_total_min: isNaN(tiempo_total_min as number) ? null : tiempo_total_min,
    segmento_espera, segmento_orden, es_demora,
    observacion: get("observacion") ? String(get("observacion")).trim() : null,
  };
}

function processRows(rawRows: ExcelRow[], headers: string[], mapping: ExcelMapping) {
  const valid: ImportedExcelRow[] = [];
  let invalid = 0;
  for (const row of rawRows) {
    const r = transformRow(row, headers, mapping);
    if (r) valid.push(r);
    else invalid++;
  }
  return { valid, invalid };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center bg-[var(--sg-accent)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" className="fill-[var(--sg-canvas)]" style={{ width: size * 0.57, height: size * 0.57 }}>
        <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
      </svg>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 items-center justify-center border transition-colors ${
                done   ? "border-[var(--sg-success)] bg-[rgba(107,189,138,0.12)]"
                : active ? "border-[var(--sg-accent)] bg-[rgba(200,168,75,0.12)]"
                : "border-[var(--sg-line)] bg-transparent"
              }`}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)]" />
                ) : (
                  <s.icon className="h-4 w-4" style={{ color: active ? "var(--sg-accent)" : "var(--sg-muted)" }} />
                )}
              </div>
              <span className="sg-font-mono text-[9px] uppercase tracking-widest hidden sm:block"
                style={{ color: active ? "var(--sg-accent)" : done ? "var(--sg-success)" : "var(--sg-muted)" }}>
                {s.label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="mx-2 h-px w-6 sm:w-10 transition-colors"
                style={{ background: done ? "var(--sg-success)" : "var(--sg-line)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function parseResponsables(text: string): string[] {
  return text.split(/[\n,;]+/).map((l) => l.trim().replace(/^["']|["']$/g, "")).filter((l) => l.length > 1 && l.length < 80);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Progress saver — recover saved state
  const { saved, save, clear } = useProgressSaver();

  // Step 0 — empresa
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector]       = useState(SECTORS[0]);
  const [contactName, setContactName] = useState("");
  const [plantasText, setPlantasText] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64]   = useState<string | null>(null);
  const [logoMimeType, setLogoMimeType] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 1 — acceso
  const [notificationEmail, setNotificationEmail] = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Step 2 — personal
  const [uploadMode, setUploadMode]   = useState<"file" | "manual">("file");
  const [manualText, setManualText]   = useState("");
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [fileName, setFileName]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3 — guardias
  const [guardias, setGuardias] = useState<{ email: string; password: string; plant: string }[]>([]);
  const [guardiaEmail, setGuardiaEmail]     = useState("");
  const [guardiaPassword, setGuardiaPassword] = useState("");
  const [guardiaPlant, setGuardiaPlant]     = useState("");
  const [showGuardiaPwd, setShowGuardiaPwd] = useState(false);

  // Step 4 — Excel import
  const excelFileRef                    = useRef<HTMLInputElement>(null);
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<ExcelRow[]>([]);
  const [excelMapping, setExcelMapping] = useState<ExcelMapping>({});
  const [excelValidRows, setExcelValidRows] = useState<ImportedExcelRow[]>([]);
  const [excelInvalidCount, setExcelInvalidCount] = useState(0);

  // Restore saved progress on mount
  useEffect(() => {
    if (!saved || done) return;

    const progress = saved as ProgressState;
    const frame = requestAnimationFrame(() => {
      setCompanyName(progress.companyName);
      setSector(progress.sector);
      setContactName(progress.contactName);
      setPlantasText(progress.plantasText);
      setNotificationEmail(progress.notificationEmail);
      setEmail(progress.email);
      setParsedNames(progress.parsedNames);
      setGuardias(progress.guardias);
      if (progress.logoBase64 && progress.logoMimeType) {
        setLogoBase64(progress.logoBase64);
        setLogoMimeType(progress.logoMimeType);
        setLogoPreview(`data:${progress.logoMimeType};base64,${progress.logoBase64}`);
      }
      setStep(progress.step);
    });

    return () => cancelAnimationFrame(frame);
  }, [saved, done]);

  // Save progress on each step change
  useEffect(() => {
    if (!done) {
      const progress: SaveProgressInput = {
        step,
        companyName,
        sector,
        contactName,
        plantasText,
        notificationEmail,
        email,
        logoBase64,
        logoMimeType,
        parsedNames,
        guardias,
      };
      save(progress);
    }
  }, [step, companyName, sector, contactName, plantasText, notificationEmail, email, logoBase64, logoMimeType, parsedNames, guardias, done, save]);

  // ── Logo handlers ──────────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("El logo no puede superar 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoBase64(dataUrl.split(",")[1]);
      setLogoMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null); setLogoBase64(null); setLogoMimeType(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ── Responsables handlers ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { setParsedNames(parseResponsables(ev.target?.result as string)); };
    reader.readAsText(file, "UTF-8");
  };
  const handleManualChange = (val: string) => { setManualText(val); setParsedNames(parseResponsables(val)); };
  const removeResponsable  = (idx: number) => setParsedNames(parsedNames.filter((_, i) => i !== idx));

  // ── Excel handlers ─────────────────────────────────────────────────────────
  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelParsing(true);
    try {
      const XLSX = await import("@e965/xlsx");
      const buffer = await file.arrayBuffer();
      const wb    = XLSX.read(buffer, { type: "array", cellDates: false });
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const raw   = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as ExcelRow[];

      if (raw.length < 2) { alert("El archivo no contiene datos suficientes."); setExcelParsing(false); return; }

      const headers = raw[0].map((h) => (h?.toString().trim() ?? "")).filter(Boolean) as string[];
      const rows    = raw.slice(1).filter((r) => r.some((c) => c !== null && c !== ""));

      const mapping = autoDetectMapping(headers);
      const { valid, invalid } = processRows(rows, headers, mapping);

      setExcelFileName(file.name);
      setExcelHeaders(headers);
      setExcelRawRows(rows);
      setExcelMapping(mapping);
      setExcelValidRows(valid);
      setExcelInvalidCount(invalid);
    } catch {
      alert("No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido.");
    }
    setExcelParsing(false);
  };

  const handleMappingChange = useCallback((field: string, col: string | null) => {
    setExcelMapping((prev) => {
      const next = { ...prev, [field]: col };
      const { valid, invalid } = processRows(excelRawRows, excelHeaders, next);
      setExcelValidRows(valid);
      setExcelInvalidCount(invalid);
      return next;
    });
  }, [excelRawRows, excelHeaders]);

  const clearExcel = () => {
    setExcelFileName(null); setExcelHeaders([]); setExcelRawRows([]);
    setExcelMapping({}); setExcelValidRows([]); setExcelInvalidCount(0);
    if (excelFileRef.current) excelFileRef.current.value = "";
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 0) return companyName.trim().length > 1 && contactName.trim().length > 1;
    if (step === 1) return email.trim().length > 5 && password.length >= 8 && password === confirmPassword;
    return true; // steps 2, 3, 4 are optional
  };

  const addGuardia = () => {
    const e = guardiaEmail.trim();
    const p = guardiaPassword.trim();
    if (!e || p.length < 8) return;
    if (guardias.some(g => g.email === e)) return;
    setGuardias(prev => [...prev, { email: e, password: p, plant: guardiaPlant }]);
    setGuardiaEmail(""); setGuardiaPassword(""); setGuardiaPlant("");
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);
    const result = await registerCompany({
      companyName:        companyName.trim(),
      sector,
      contactName:        contactName.trim(),
      plantasText:        plantasText.trim(),
      notificationEmail:  notificationEmail.trim() || undefined,
      supervisorEmail:    email.trim(),
      supervisorPassword: password,
      responsables:       parsedNames,
      logoBase64:         logoBase64  ?? undefined,
      logoMimeType:       logoMimeType ?? undefined,
      excelRows:          excelValidRows.length > 0 ? excelValidRows : undefined,
      guardias:           guardias.length > 0 ? guardias : undefined,
    });
    setSubmitting(false);
    if (result.success) { clear(); setDone(true); }
    else { setServerError(result.error ?? "Error al crear la cuenta."); }
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-[var(--sg-canvas)]">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: easeOut }} className="w-full max-w-[480px] text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center border border-[var(--sg-success)] bg-[rgba(107,189,138,0.12)]">
              <CheckCircle2 className="h-8 w-8 text-[var(--sg-success)]" />
            </div>
          </div>
          <div className="sg-kicker mb-3">Registro completado</div>
          <h1 className="sg-display text-[38px] mb-4">¡Bienvenida,<br /><em>{companyName}!</em></h1>
          <p className="text-[14px] font-light text-[var(--sg-copy)] leading-relaxed mb-8">
            Tu cuenta de supervisor ha sido creada correctamente.
            {parsedNames.length > 0 && <> Se cargaron <strong className="text-[var(--sg-ink)]">{parsedNames.length}</strong> responsables.</>}
            {guardias.length > 0 && <> Se crearon <strong className="text-[var(--sg-ink)]">{guardias.length}</strong> cuenta{guardias.length !== 1 ? "s" : ""} de guardia.</>}
            {excelValidRows.length > 0 && <> Se importaron <strong className="text-[var(--sg-ink)]">{excelValidRows.length.toLocaleString()}</strong> registros históricos.</>}
            <br />Inicia sesión con el correo y contraseña que registraste.
          </p>
          <Link href="/login" className="sg-btn sg-btn-accent w-full justify-center">
            Ir al inicio de sesión <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/" className="mt-4 block sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
            ← Volver al inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Preview columns to show in the preview table ───────────────────────────
  const PREVIEW_FIELDS = ["fecha", "h_registro", "razon_social", "empresa", "planta"] as const;

  return (
    <div className="min-h-screen bg-[var(--sg-canvas)]">
      {/* Header */}
      <div className="border-b border-[var(--sg-line)] bg-[rgba(10,12,11,0.92)] backdrop-blur sticky top-0 z-40">
        <div className="sg-shell flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={26} />
            <span className="sg-font-display text-[15px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">SmartGuard</span>
          </Link>
          <Link href="/login" className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
            Ya tengo cuenta →
          </Link>
        </div>
      </div>

      {saved && !done && (
        <div className="border-b border-[var(--sg-warn)] bg-[rgba(200,160,75,0.06)] px-5 py-2.5">
          <div className="sg-shell flex items-center justify-between max-w-[680px]">
            <div className="flex items-center gap-2 text-[12px] text-[var(--sg-warn)]">
              <RefreshCw className="h-3.5 w-3.5" />
              Progreso guardado — continuarás en el paso {saved.step + 1}
            </div>
            <button
              onClick={() => { clear(); window.location.reload(); }}
              className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      )}

      <div className="sg-shell py-10 md:py-16 max-w-[680px]">
        <div className="mb-10 flex justify-center">
          <StepIndicator current={step} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: easeOut }}>

            {/* ── STEP 0: Empresa ────────────────────────────────────────────── */}
            {step === 0 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 1 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Datos de tu empresa</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-7">Esta información identifica a tu organización dentro de SmartGuard.</p>

                <div className="grid gap-5">
                  <div className="sg-field">
                    <label className="sg-label">Nombre de la empresa *</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                      <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej: Industrias Andinas S.A." className="sg-input pl-10" autoFocus />
                    </div>
                  </div>

                  <div className="sg-field">
                    <label className="sg-label">Sector industrial *</label>
                    <select value={sector} onChange={(e) => setSector(e.target.value)} className="sg-select">
                      {SECTORS.map((s) => <option key={s} value={s} className="bg-[var(--sg-panel-2)]">{s}</option>)}
                    </select>
                  </div>

                  <div className="sg-field">
                    <label className="sg-label">Nombre del contacto principal *</label>
                    <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                      placeholder="Ej: Carlos Mendoza" className="sg-input" />
                  </div>

                  <div className="sg-field">
                    <label className="sg-label">
                      Email para alertas operativas{" "}
                      <span className="normal-case text-[var(--sg-muted)]">(opcional)</span>
                    </label>
                    <input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)}
                      placeholder="alertas@empresa.com" className="sg-input" />
                    <p className="text-[10px] text-[var(--sg-muted)]">Recibirá emails automáticos cuando haya demoras críticas. Si se deja vacío se usará el correo del supervisor.</p>
                  </div>

                  <div className="sg-field">
                    <label className="sg-label">
                      Plantas / Garitas{" "}
                      <span className="normal-case text-[var(--sg-muted)]">(separadas por coma)</span>
                    </label>
                    <input type="text" value={plantasText} onChange={(e) => setPlantasText(e.target.value)}
                      placeholder="Ej: Lomas, Cajamarquilla, Planta Norte" className="sg-input" />
                    <p className="text-[10px] text-[var(--sg-muted)]">Los guardias solo podrán registrar ingresos en estas plantas.</p>
                  </div>

                  <div className="sg-field">
                    <span className="sg-label">Logo <span className="normal-case text-[var(--sg-muted)]">(opcional)</span></span>
                    <input ref={logoInputRef} id="logo-upload" type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} className="hidden" />
                    {logoPreview ? (
                      <div className="flex items-center gap-4 border border-[var(--sg-accent)] bg-[var(--sg-panel-2)] px-4 py-3">
                        <Image unoptimized width={48} height={48} src={logoPreview} alt="Logo" className="h-12 w-12 object-contain shrink-0 border border-[var(--sg-line)] bg-white p-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[var(--sg-ink)]">Logo cargado</div>
                          <label htmlFor="logo-upload" className="cursor-pointer text-[11px] text-[var(--sg-accent)] hover:opacity-80 transition-opacity">Cambiar imagen</label>
                        </div>
                        <button type="button" onClick={clearLogo} className="shrink-0 text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="logo-upload" className="flex cursor-pointer items-center gap-4 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-4 hover:border-[var(--sg-accent)] transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-3)]">
                          <Upload className="h-5 w-5 text-[var(--sg-muted)]" />
                        </div>
                        <div>
                          <div className="text-[13px] text-[var(--sg-copy)]">Haz clic para subir el logo</div>
                          <div className="text-[11px] text-[var(--sg-muted)] mt-0.5">PNG, JPG, SVG · máx. 1 MB</div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: Acceso ──────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 2 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Cuenta de supervisor</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-7">Esta será la cuenta principal del supervisor de tu empresa.</p>

                <div className="grid gap-5">
                  <div className="sg-field">
                    <label className="sg-label">Correo electrónico *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="supervisor@empresa.com" className="sg-input" autoFocus />
                  </div>
                  <div className="sg-field">
                    <label className="sg-label">Contraseña *</label>
                    <div className="relative">
                      <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres" className="sg-input pr-12" />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-[11px] text-[var(--sg-danger)]">Mínimo 8 caracteres</p>
                    )}
                  </div>
                  <div className="sg-field">
                    <label className="sg-label">Confirmar contraseña *</label>
                    <div className="relative">
                      <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" className="sg-input pr-12" />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="text-[11px] text-[var(--sg-danger)]">Las contraseñas no coinciden</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Personal ────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 3 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Personal de almacén</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-2">
                  Carga la lista de responsables de almacén. Aparecerán en el formulario de registro.
                </p>
                <p className="text-[11px] text-[var(--sg-muted)] mb-7 flex items-center gap-2">
                  <span className="h-px w-4 bg-[var(--sg-line)]" />
                  Opcional — puedes agregarlos más tarde desde el panel.
                </p>

                <div className="flex mb-5 border border-[var(--sg-line)]">
                  {(["file", "manual"] as const).map((mode) => (
                    <button key={mode} onClick={() => setUploadMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest transition-colors ${
                        uploadMode === mode ? "bg-[var(--sg-panel-2)] text-[var(--sg-ink)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-copy)]"
                      }`}>
                      {mode === "file" ? <><Upload className="h-3.5 w-3.5" />Subir CSV</> : <><FileText className="h-3.5 w-3.5" />Manual</>}
                    </button>
                  ))}
                </div>

                {uploadMode === "file" ? (
                  <div>
                    <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center gap-3 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] py-8 px-5 text-center hover:border-[var(--sg-accent)] transition-colors">
                      <Upload className="h-8 w-8 text-[var(--sg-muted)]" />
                      <div>
                        <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                          {fileName ?? "Seleccionar archivo CSV"}
                        </div>
                        <div className="mt-1 text-[12px] text-[var(--sg-muted)]">Una columna con nombres, un nombre por fila</div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="sg-field">
                    <label className="sg-label">Un nombre por línea</label>
                    <textarea value={manualText} onChange={(e) => handleManualChange(e.target.value)}
                      placeholder={"Juan Pérez\nMaría López\nCarlos Soto"} className="sg-textarea min-h-[120px]" />
                  </div>
                )}

                {parsedNames.length > 0 && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                        {parsedNames.length} responsable{parsedNames.length !== 1 ? "s" : ""} detectado{parsedNames.length !== 1 ? "s" : ""}
                      </div>
                      <button
                        onClick={() => { setParsedNames([]); setFileName(null); setManualText(""); if (fileRef.current) fileRef.current.value = ""; }}
                        className="flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)] hover:opacity-70 transition-opacity">
                        <Trash2 className="h-3 w-3" /> Limpiar todo
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
                      {parsedNames.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5">
                          <span className="text-[12px] text-[var(--sg-ink)]">{name}</span>
                          <button onClick={() => removeResponsable(i)} className="text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Cuentas de Guardias ─────────────────────────────────── */}
            {step === 3 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 4 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Cuentas de guardias</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-2">
                  Crea los accesos para los guardias que registrarán ingresos en portería.
                </p>
                <p className="text-[11px] text-[var(--sg-muted)] mb-7 flex items-center gap-2">
                  <span className="h-px w-4 bg-[var(--sg-line)]" />
                  Opcional — puedes crear cuentas de guardia más tarde desde /usuarios.
                </p>

                <div className="grid gap-4 mb-6 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
                  <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Nuevo guardia</div>
                  <div className="sg-field">
                    <label className="sg-label">Correo electrónico *</label>
                    <input type="email" value={guardiaEmail} onChange={e => setGuardiaEmail(e.target.value)}
                      placeholder="guardia@empresa.com" className="sg-input" />
                  </div>
                  <div className="sg-field">
                    <label className="sg-label">Contraseña * (mín. 8 caracteres)</label>
                    <div className="relative">
                      <input type={showGuardiaPwd ? "text" : "password"} value={guardiaPassword}
                        onChange={e => setGuardiaPassword(e.target.value)}
                        placeholder="Contraseña temporal" className="sg-input pr-12" />
                      <button type="button" onClick={() => setShowGuardiaPwd(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                        {showGuardiaPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {plantasText.trim() && (
                    <div className="sg-field">
                      <label className="sg-label">Planta asignada</label>
                      <select value={guardiaPlant} onChange={e => setGuardiaPlant(e.target.value)} className="sg-select">
                        <option value="">Sin planta fija</option>
                        {plantasText.split(",").map(p => p.trim()).filter(Boolean).map(p => (
                          <option key={p} value={p} className="bg-[var(--sg-panel-2)]">{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button type="button" onClick={addGuardia}
                    disabled={!guardiaEmail.trim() || guardiaPassword.length < 8}
                    className="sg-btn sg-btn-primary sg-btn-sm self-start disabled:opacity-40">
                    <UserPlus className="h-4 w-4" /> Agregar guardia
                  </button>
                </div>

                {guardias.length > 0 && (
                  <div>
                    <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
                      {guardias.length} guardia{guardias.length !== 1 ? "s" : ""} agregado{guardias.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex flex-col gap-2">
                      {guardias.map((g, i) => (
                        <div key={i} className="flex items-center justify-between border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-2.5">
                          <div>
                            <div className="text-[13px] text-[var(--sg-ink)]">{g.email}</div>
                            {g.plant && <div className="text-[10px] text-[var(--sg-muted)] mt-0.5">Planta: {g.plant}</div>}
                          </div>
                          <button type="button" onClick={() => setGuardias(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Importar datos Excel ────────────────────────────────── */}
            {step === 4 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 5 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Importar datos históricos</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-2">
                  Sube tu archivo Excel con registros de acceso anteriores. SmartGuard detectará las columnas automáticamente.
                </p>
                <p className="text-[11px] text-[var(--sg-muted)] mb-7 flex items-center gap-2">
                  <span className="h-px w-4 bg-[var(--sg-line)]" />
                  Opcional — puedes importar datos más tarde desde el historial.
                </p>

                <input ref={excelFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelChange} className="hidden" />

                {!excelFileName ? (
                  <button onClick={() => excelFileRef.current?.click()} disabled={excelParsing}
                    className="w-full flex flex-col items-center gap-4 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] py-10 px-5 text-center hover:border-[var(--sg-accent)] hover:bg-[var(--sg-panel)] transition-colors disabled:opacity-60">
                    {excelParsing ? (
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <RefreshCw className="h-10 w-10 text-[var(--sg-muted)]" />
                      </motion.span>
                    ) : (
                      <FileSpreadsheet className="h-10 w-10 text-[var(--sg-muted)]" />
                    )}
                    <div>
                      <div className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                        {excelParsing ? "Leyendo archivo…" : "Seleccionar archivo Excel"}
                      </div>
                      <div className="mt-1 text-[12px] text-[var(--sg-muted)]">.xlsx · .xls · .csv — hasta 10,000 filas</div>
                    </div>
                  </button>
                ) : (
                  <div className="grid gap-5">
                    {/* File info bar */}
                    <div className="flex items-center justify-between border border-[var(--sg-accent)] bg-[rgba(200,168,75,0.06)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-[var(--sg-accent)] shrink-0" />
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--sg-ink)]">{excelFileName}</div>
                          <div className="text-[11px] text-[var(--sg-muted)]">
                            {excelRawRows.length.toLocaleString()} filas · {excelHeaders.length} columnas detectadas
                          </div>
                        </div>
                      </div>
                      <button onClick={clearExcel} className="text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Column mapping */}
                    <div>
                      <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
                        Mapeo de columnas
                      </div>
                      <div className="border border-[var(--sg-line)] divide-y divide-[var(--sg-line)]">
                        {/* Header row */}
                        <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-[var(--sg-panel-2)]">
                          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Campo SmartGuard</span>
                          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Tu columna Excel</span>
                        </div>
                        {PLATFORM_FIELDS.map((f) => (
                          <div key={f.key} className="grid grid-cols-2 gap-4 items-center px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] text-[var(--sg-copy)]">{f.label}</span>
                              {f.required && <span className="text-[var(--sg-accent)] text-[10px]">*</span>}
                            </div>
                            <select
                              value={excelMapping[f.key] ?? ""}
                              onChange={(e) => handleMappingChange(f.key, e.target.value || null)}
                              className="sg-select text-[12px] py-1.5"
                            >
                              <option value="">(no mapear)</option>
                              {excelHeaders.map((h) => (
                                <option key={h} value={h} className="bg-[var(--sg-panel-2)]">{h}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {excelValidRows.length > 0 && (
                      <div>
                        <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
                          Vista previa (primeras 5 filas)
                        </div>
                        <div className="overflow-x-auto border border-[var(--sg-line)]">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
                                {PREVIEW_FIELDS.filter((k) => excelMapping[k]).map((k) => {
                                  const f = PLATFORM_FIELDS.find((p) => p.key === k);
                                  return (
                                    <th key={k} className="px-3 py-2 text-left sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] whitespace-nowrap">
                                      {f?.label ?? k}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {excelValidRows.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-b border-[var(--sg-line)] last:border-0">
                                  {PREVIEW_FIELDS.filter((k) => excelMapping[k]).map((k) => (
                                    <td key={k} className="px-3 py-2 text-[var(--sg-copy)] whitespace-nowrap max-w-[160px] truncate">
                                      {String(row[k] ?? "—")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-[var(--sg-muted)] shrink-0" />
                      <div className="text-[12px] text-[var(--sg-copy)]">
                        <span className="text-[var(--sg-success)] font-semibold">{excelValidRows.length.toLocaleString()} filas válidas</span>
                        {excelInvalidCount > 0 && (
                          <span className="text-[var(--sg-muted)]"> · {excelInvalidCount} omitidas (sin fecha o razón social)</span>
                        )}
                        {excelValidRows.length > 10_000 && (
                          <span className="text-[var(--sg-warn)]"> · Se importarán las primeras 10,000</span>
                        )}
                  </div>
                </div>

                {!showPreview ? (
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="mt-4 flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current"><path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" /></svg>
                    Ver preview de tu dashboard →
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <OnboardingPreview companyName={companyName} plantas={plantasText} />
                  </motion.div>
                )}
              </div>
            )}
              </div>
            )}

            {/* ── STEP 5: Confirmar ───────────────────────────────────────────── */}
            {step === 5 && (
              <div className="sg-panel p-7 md:p-9">
                <div className="sg-kicker mb-3">Paso 6 de 6</div>
                <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1">Confirmar registro</h2>
                <p className="text-[13px] font-light text-[var(--sg-copy)] mb-7">Revisa los datos antes de crear la cuenta.</p>

                <div className="grid gap-3 mb-7">
                  {[
                    { label: "Empresa",          value: companyName },
                    { label: "Sector",           value: sector },
                    { label: "Contacto",         value: contactName },
                    { label: "Plantas",          value: plantasText || "No especificadas" },
                    { label: "Email supervisor", value: email },
                    { label: "Email alertas",    value: notificationEmail || "(mismo que supervisor)" },
                    { label: "Responsables",     value: parsedNames.length > 0 ? `${parsedNames.length} persona${parsedNames.length !== 1 ? "s" : ""}` : "No cargados" },
                    { label: "Guardias",         value: guardias.length > 0 ? `${guardias.length} cuenta${guardias.length !== 1 ? "s" : ""} · ${guardias.map(g => g.email).join(", ")}` : "No agregados" },
                    { label: "Datos históricos", value: excelValidRows.length > 0 ? `${excelValidRows.length.toLocaleString()} registros a importar` : "No seleccionados" },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[160px_1fr] gap-4 border-b border-[var(--sg-line)] pb-3">
                      <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">{row.label}</span>
                      <span className="text-[13px] text-[var(--sg-ink)]">{row.value}</span>
                    </div>
                  ))}
                </div>

                {serverError && (
                  <div className="mb-5 border-l-2 border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] p-3 text-[13px] text-[var(--sg-danger)]">
                    {serverError}
                  </div>
                )}

                <motion.button onClick={handleSubmit} disabled={submitting} whileTap={{ scale: 0.98 }}
                  className={`sg-btn sg-btn-accent w-full justify-center h-12 ${submitting ? "opacity-70 cursor-wait" : ""}`}>
                  {submitting ? (
                    <span className="flex items-center gap-3">
                      <motion.span className="inline-flex h-4 w-4 rounded-full border-2 border-[rgba(20,17,10,0.3)] border-t-[#14110a]"
                        animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
                      {excelValidRows.length > 1000
                        ? `Importando ${excelValidRows.length.toLocaleString()} registros… (~${Math.ceil(excelValidRows.length / 500) * 3}s)`
                        : excelValidRows.length > 0
                        ? "Importando datos históricos…"
                        : "Creando cuenta…"}
                    </span>
                  ) : (
                    <>Crear cuenta de empresa <ArrowRight className="h-4 w-4" /></>
                  )}
                </motion.button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 6 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button onClick={() => step > 0 && setStep((s) => s - 1)} disabled={step === 0}
              className="sg-btn sg-btn-ghost sg-btn-sm disabled:opacity-30">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>

            <div className="flex items-center gap-3">
              {(step === 2 || step === 3 || step === 4) && (
                <button onClick={() => setStep((s) => s + 1)}
                  className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
                  Omitir →
                </button>
              )}
              {step < 5 && (
                <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
                  className="sg-btn sg-btn-primary sg-btn-sm disabled:opacity-30">
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--sg-ink)]">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
