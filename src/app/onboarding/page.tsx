"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useCallback, useEffect } from "react";
import { registerCompany } from "./actions";
import { useProgressSaver } from "@/lib/useProgressSaver";
import {
  AccessStep,
  CompanyStep,
  ConfirmStep,
  ExcelImportStep,
  GuardiasStep,
  PersonnelStep,
} from "./OnboardingSteps";
import {
  DoneScreen,
  LogoMark,
  OnboardingNavigation,
  ResumeBanner,
  StepIndicator,
} from "./OnboardingShared";
import { easeOut, parseResponsables, SECTORS } from "./onboardingUtils";
import {
  type ExcelRow,
  type ExcelMapping,
  type ImportedExcelRow,
  prepareExcelImport,
  processRows,
} from "@/utils/excel-import";

type ProgressState = NonNullable<ReturnType<typeof useProgressSaver>["saved"]>;
type SaveProgressInput = Parameters<ReturnType<typeof useProgressSaver>["save"]>[0];

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
  const [notificationPhone, setNotificationPhone] = useState("");
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
  const [excelDefaultPlant, setExcelDefaultPlant] = useState<string | null>(null);

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
      setNotificationPhone(progress.notificationPhone ?? "");
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
        notificationPhone,
        email,
        logoBase64,
        logoMimeType,
        parsedNames,
        guardias,
      };
      save(progress);
    }
  }, [step, companyName, sector, contactName, plantasText, notificationEmail, notificationPhone, email, logoBase64, logoMimeType, parsedNames, guardias, done, save]);

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
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as ExcelRow[],
      }));
      const prepared = prepareExcelImport(sheets, file.name);

      if (!prepared || prepared.rows.length < 1) { alert("No se encontró una hoja con columnas de registros vehiculares."); setExcelParsing(false); return; }

      setExcelFileName(file.name);
      setExcelHeaders(prepared.headers);
      setExcelRawRows(prepared.rows);
      setExcelMapping(prepared.mapping);
      setExcelDefaultPlant(prepared.valid[0]?.planta ?? null);
      setExcelValidRows(prepared.valid);
      setExcelInvalidCount(prepared.invalid);
    } catch {
      alert("No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido.");
    }
    setExcelParsing(false);
  };

  const handleMappingChange = useCallback((field: string, col: string | null) => {
    setExcelMapping((prev) => {
      const next = { ...prev, [field]: col };
      const { valid, invalid } = processRows(excelRawRows, excelHeaders, next, { planta: excelDefaultPlant });
      setExcelValidRows(valid);
      setExcelInvalidCount(invalid);
      return next;
    });
  }, [excelRawRows, excelHeaders, excelDefaultPlant]);

  const clearExcel = () => {
    setExcelFileName(null); setExcelHeaders([]); setExcelRawRows([]);
    setExcelMapping({}); setExcelValidRows([]); setExcelInvalidCount(0); setExcelDefaultPlant(null);
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
      notificationPhone:  notificationPhone.trim() || undefined,
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

  if (done) {
    return (
      <DoneScreen
        companyName={companyName}
        responsablesCount={parsedNames.length}
        guardiasCount={guardias.length}
        importedRowsCount={excelValidRows.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sg-canvas)]">
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
        <ResumeBanner
          savedStep={saved.step}
          onReset={() => {
            clear();
            window.location.reload();
          }}
        />
      )}

      <div className="sg-shell py-10 md:py-16 max-w-[680px]">
        <div className="mb-10 flex justify-center">
          <StepIndicator current={step} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            {step === 0 && (
              <CompanyStep
                companyName={companyName}
                sector={sector}
                contactName={contactName}
                plantasText={plantasText}
                notificationEmail={notificationEmail}
                notificationPhone={notificationPhone}
                logoPreview={logoPreview}
                logoInputRef={logoInputRef}
                onCompanyNameChange={setCompanyName}
                onSectorChange={setSector}
                onContactNameChange={setContactName}
                onPlantasTextChange={setPlantasText}
                onNotificationEmailChange={setNotificationEmail}
                onNotificationPhoneChange={setNotificationPhone}
                onLogoChange={handleLogoChange}
                onClearLogo={clearLogo}
              />
            )}

            {step === 1 && (
              <AccessStep
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                showPwd={showPwd}
                showConfirm={showConfirm}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onToggleShowPwd={() => setShowPwd((value) => !value)}
                onToggleShowConfirm={() => setShowConfirm((value) => !value)}
              />
            )}

            {step === 2 && (
              <PersonnelStep
                uploadMode={uploadMode}
                manualText={manualText}
                parsedNames={parsedNames}
                fileName={fileName}
                fileRef={fileRef}
                onUploadModeChange={setUploadMode}
                onFileChange={handleFileChange}
                onManualChange={handleManualChange}
                onRemoveResponsable={removeResponsable}
                onClearResponsables={() => {
                  setParsedNames([]);
                  setFileName(null);
                  setManualText("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            )}

            {step === 3 && (
              <GuardiasStep
                guardias={guardias}
                guardiaEmail={guardiaEmail}
                guardiaPassword={guardiaPassword}
                guardiaPlant={guardiaPlant}
                plantasText={plantasText}
                showGuardiaPwd={showGuardiaPwd}
                onGuardiaEmailChange={setGuardiaEmail}
                onGuardiaPasswordChange={setGuardiaPassword}
                onGuardiaPlantChange={setGuardiaPlant}
                onToggleShowGuardiaPwd={() => setShowGuardiaPwd((value) => !value)}
                onAddGuardia={addGuardia}
                onRemoveGuardia={(index) => {
                  setGuardias((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
                }}
              />
            )}

            {step === 4 && (
              <ExcelImportStep
                excelFileRef={excelFileRef}
                excelParsing={excelParsing}
                excelFileName={excelFileName}
                excelHeaders={excelHeaders}
                excelRawRows={excelRawRows}
                excelMapping={excelMapping}
                excelValidRows={excelValidRows}
                excelInvalidCount={excelInvalidCount}
                showPreview={showPreview}
                onExcelChange={handleExcelChange}
                onClearExcel={clearExcel}
                onMappingChange={handleMappingChange}
                onShowPreview={setShowPreview}
                companyName={companyName}
                plantasText={plantasText}
              />
            )}

            {step === 5 && (
              <ConfirmStep
                companyName={companyName}
                sector={sector}
                contactName={contactName}
                plantasText={plantasText}
                email={email}
                notificationEmail={notificationEmail}
                notificationPhone={notificationPhone}
                parsedNames={parsedNames}
                guardias={guardias}
                excelValidRows={excelValidRows}
                serverError={serverError}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <OnboardingNavigation
          step={step}
          canProceed={canProceed()}
          onBack={() => {
            if (step > 0) setStep((currentStep) => currentStep - 1);
          }}
          onSkip={() => setStep((currentStep) => currentStep + 1)}
          onNext={() => setStep((currentStep) => currentStep + 1)}
        />

        <div className="mt-8 text-center sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--sg-ink)]">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
