"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import OnboardingPreview from "@/components/OnboardingPreview";
import {
  type ExcelMapping,
  type ExcelRow,
  type ImportedExcelRow,
  PLATFORM_FIELDS,
} from "@/utils/excel-import";
import { PREVIEW_FIELDS, SECTORS } from "./onboardingUtils";

export function CompanyStep({
  companyName,
  sector,
  contactName,
  plantasText,
  notificationEmail,
  notificationPhone,
  logoPreview,
  logoInputRef,
  onCompanyNameChange,
  onSectorChange,
  onContactNameChange,
  onPlantasTextChange,
  onNotificationEmailChange,
  onNotificationPhoneChange,
  onLogoChange,
  onClearLogo,
}: {
  companyName: string;
  sector: string;
  contactName: string;
  plantasText: string;
  notificationEmail: string;
  notificationPhone: string;
  logoPreview: string | null;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onCompanyNameChange: (value: string) => void;
  onSectorChange: (value: string) => void;
  onContactNameChange: (value: string) => void;
  onPlantasTextChange: (value: string) => void;
  onNotificationEmailChange: (value: string) => void;
  onNotificationPhoneChange: (value: string) => void;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: (event: React.MouseEvent) => void;
}) {
  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 1 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Datos de tu empresa</h2>
      <p className="mb-7 text-[13px] font-light text-[var(--sg-copy)]">Esta información identifica a tu organización dentro de SmartGuard.</p>

      <div className="grid gap-5">
        <div className="sg-field">
          <label className="sg-label">Nombre de la empresa *</label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
            <input
              type="text"
              value={companyName}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              placeholder="Ej: Industrias Andinas S.A."
              className="sg-input pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="sg-field">
          <label className="sg-label">Sector industrial *</label>
          <select value={sector} onChange={(event) => onSectorChange(event.target.value)} className="sg-select">
            {SECTORS.map((item) => (
              <option key={item} value={item} className="bg-[var(--sg-panel-2)]">{item}</option>
            ))}
          </select>
        </div>

        <div className="sg-field">
          <label className="sg-label">Nombre del contacto principal *</label>
          <input
            type="text"
            value={contactName}
            onChange={(event) => onContactNameChange(event.target.value)}
            placeholder="Ej: Carlos Mendoza"
            className="sg-input"
          />
        </div>

        <div className="sg-field">
          <label className="sg-label">
            Email para alertas operativas{" "}
            <span className="normal-case text-[var(--sg-muted)]">(opcional)</span>
          </label>
          <input
            type="email"
            value={notificationEmail}
            onChange={(event) => onNotificationEmailChange(event.target.value)}
            placeholder="alertas@empresa.com"
            className="sg-input"
          />
          <p className="text-[10px] text-[var(--sg-muted)]">Recibirá emails automáticos cuando haya demoras críticas. Si se deja vacío se usará el correo del supervisor.</p>
        </div>

        <div className="sg-field">
          <label className="sg-label">
            WhatsApp para alertas{" "}
            <span className="normal-case text-[var(--sg-muted)]">(opcional)</span>
          </label>
          <input
            type="tel"
            value={notificationPhone}
            onChange={(event) => onNotificationPhoneChange(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="51987654321"
            className="sg-input"
            maxLength={15}
          />
          <p className="text-[10px] text-[var(--sg-muted)]">Solo dígitos, sin + ni espacios. Incluye código de país (Perú: 51). Puedes agregar más números después en /configuracion.</p>
        </div>

        <div className="sg-field">
          <label className="sg-label">
            Plantas / Garitas{" "}
            <span className="normal-case text-[var(--sg-muted)]">(separadas por coma)</span>
          </label>
          <input
            type="text"
            value={plantasText}
            onChange={(event) => onPlantasTextChange(event.target.value)}
            placeholder="Ej: Lomas, Cajamarquilla, Planta Norte"
            className="sg-input"
          />
          <p className="text-[10px] text-[var(--sg-muted)]">Los guardias solo podrán registrar ingresos en estas plantas.</p>
        </div>

        <div className="sg-field">
          <span className="sg-label">Logo <span className="normal-case text-[var(--sg-muted)]">(opcional)</span></span>
          <input
            ref={logoInputRef}
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onLogoChange}
            className="hidden"
          />
          {logoPreview ? (
            <div className="flex items-center gap-4 border border-[var(--sg-accent)] bg-[var(--sg-panel-2)] px-4 py-3">
              <Image unoptimized width={48} height={48} src={logoPreview} alt="Logo" className="h-12 w-12 shrink-0 border border-[var(--sg-line)] bg-white p-0.5 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--sg-ink)]">Logo cargado</div>
                <label htmlFor="logo-upload" className="cursor-pointer text-[11px] text-[var(--sg-accent)] transition-opacity hover:opacity-80">Cambiar imagen</label>
              </div>
              <button type="button" onClick={onClearLogo} className="shrink-0 text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label htmlFor="logo-upload" className="flex cursor-pointer items-center gap-4 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-4 transition-colors hover:border-[var(--sg-accent)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-3)]">
                <Upload className="h-5 w-5 text-[var(--sg-muted)]" />
              </div>
              <div>
                <div className="text-[13px] text-[var(--sg-copy)]">Haz clic para subir el logo</div>
                <div className="mt-0.5 text-[11px] text-[var(--sg-muted)]">PNG, JPG, WEBP · máx. 1 MB</div>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export function AccessStep({
  email,
  password,
  confirmPassword,
  showPwd,
  showConfirm,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPwd,
  onToggleShowConfirm,
}: {
  email: string;
  password: string;
  confirmPassword: string;
  showPwd: boolean;
  showConfirm: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowPwd: () => void;
  onToggleShowConfirm: () => void;
}) {
  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 2 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Cuenta de supervisor</h2>
      <p className="mb-7 text-[13px] font-light text-[var(--sg-copy)]">Esta será la cuenta principal del supervisor de tu empresa.</p>

      <div className="grid gap-5">
        <div className="sg-field">
          <label className="sg-label">Correo electrónico *</label>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="supervisor@empresa.com"
            className="sg-input"
            autoFocus
          />
        </div>
        <div className="sg-field">
          <label className="sg-label">Contraseña *</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="sg-input pr-12"
            />
            <button type="button" onClick={onToggleShowPwd} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
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
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="Repite la contraseña"
              className="sg-input pr-12"
            />
            <button type="button" onClick={onToggleShowConfirm} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-[11px] text-[var(--sg-danger)]">Las contraseñas no coinciden</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersonnelStep({
  uploadMode,
  manualText,
  parsedNames,
  fileName,
  fileRef,
  onUploadModeChange,
  onFileChange,
  onManualChange,
  onRemoveResponsable,
  onClearResponsables,
}: {
  uploadMode: "file" | "manual";
  manualText: string;
  parsedNames: string[];
  fileName: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onUploadModeChange: (mode: "file" | "manual") => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onManualChange: (value: string) => void;
  onRemoveResponsable: (index: number) => void;
  onClearResponsables: () => void;
}) {
  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 3 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Personal de almacén</h2>
      <p className="mb-2 text-[13px] font-light text-[var(--sg-copy)]">
        Carga la lista de responsables de almacén. Aparecerán en el formulario de registro.
      </p>
      <p className="mb-7 flex items-center gap-2 text-[11px] text-[var(--sg-muted)]">
        <span className="h-px w-4 bg-[var(--sg-line)]" />
        Opcional — puedes agregarlos más tarde desde el panel.
      </p>

      <div className="mb-5 flex border border-[var(--sg-line)]">
        {(["file", "manual"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onUploadModeChange(mode)}
            className={`sg-font-mono flex flex-1 items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-widest transition-colors ${
              uploadMode === mode ? "bg-[var(--sg-panel-2)] text-[var(--sg-ink)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-copy)]"
            }`}
          >
            {mode === "file" ? <><Upload className="h-3.5 w-3.5" />Subir CSV</> : <><FileText className="h-3.5 w-3.5" />Manual</>}
          </button>
        ))}
      </div>

      {uploadMode === "file" ? (
        <div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-5 py-8 text-center transition-colors hover:border-[var(--sg-accent)]"
          >
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
          <textarea
            value={manualText}
            onChange={(event) => onManualChange(event.target.value)}
            placeholder={"Juan Pérez\nMaría López\nCarlos Soto"}
            className="sg-textarea min-h-[120px]"
          />
        </div>
      )}

      {parsedNames.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
              {parsedNames.length} responsable{parsedNames.length !== 1 ? "s" : ""} detectado{parsedNames.length !== 1 ? "s" : ""}
            </div>
            <button onClick={onClearResponsables} className="sg-font-mono flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-danger)] transition-opacity hover:opacity-70">
              <Trash2 className="h-3 w-3" /> Limpiar todo
            </button>
          </div>
          <div className="flex max-h-[180px] flex-wrap gap-2 overflow-y-auto">
            {parsedNames.map((name, index) => (
              <div key={index} className="flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5">
                <span className="text-[12px] text-[var(--sg-ink)]">{name}</span>
                <button onClick={() => onRemoveResponsable(index)} className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GuardiasStep({
  guardias,
  guardiaEmail,
  guardiaPassword,
  guardiaPlant,
  plantasText,
  showGuardiaPwd,
  onGuardiaEmailChange,
  onGuardiaPasswordChange,
  onGuardiaPlantChange,
  onToggleShowGuardiaPwd,
  onAddGuardia,
  onRemoveGuardia,
}: {
  guardias: { email: string; password: string; plant: string }[];
  guardiaEmail: string;
  guardiaPassword: string;
  guardiaPlant: string;
  plantasText: string;
  showGuardiaPwd: boolean;
  onGuardiaEmailChange: (value: string) => void;
  onGuardiaPasswordChange: (value: string) => void;
  onGuardiaPlantChange: (value: string) => void;
  onToggleShowGuardiaPwd: () => void;
  onAddGuardia: () => void;
  onRemoveGuardia: (index: number) => void;
}) {
  const plants = plantasText.split(",").map((plant) => plant.trim()).filter(Boolean);

  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 4 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Cuentas de guardias</h2>
      <p className="mb-2 text-[13px] font-light text-[var(--sg-copy)]">
        Crea los accesos para los guardias que registrarán ingresos en portería.
      </p>
      <p className="mb-7 flex items-center gap-2 text-[11px] text-[var(--sg-muted)]">
        <span className="h-px w-4 bg-[var(--sg-line)]" />
        Opcional — puedes crear cuentas de guardia más tarde desde /usuarios.
      </p>

      <div className="mb-6 grid gap-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
        <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Nuevo guardia</div>
        <div className="sg-field">
          <label className="sg-label">Correo electrónico *</label>
          <input
            type="email"
            value={guardiaEmail}
            onChange={(event) => onGuardiaEmailChange(event.target.value)}
            placeholder="guardia@empresa.com"
            className="sg-input"
          />
        </div>
        <div className="sg-field">
          <label className="sg-label">Contraseña * (mín. 8 caracteres)</label>
          <div className="relative">
            <input
              type={showGuardiaPwd ? "text" : "password"}
              value={guardiaPassword}
              onChange={(event) => onGuardiaPasswordChange(event.target.value)}
              placeholder="Contraseña temporal"
              className="sg-input pr-12"
            />
            <button type="button" onClick={onToggleShowGuardiaPwd} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
              {showGuardiaPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {plants.length > 0 && (
          <div className="sg-field">
            <label className="sg-label">Planta asignada</label>
            <select value={guardiaPlant} onChange={(event) => onGuardiaPlantChange(event.target.value)} className="sg-select">
              <option value="">Sin planta fija</option>
              {plants.map((plant) => (
                <option key={plant} value={plant} className="bg-[var(--sg-panel-2)]">{plant}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={onAddGuardia}
          disabled={!guardiaEmail.trim() || guardiaPassword.length < 8}
          className="sg-btn sg-btn-primary sg-btn-sm self-start disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" /> Agregar guardia
        </button>
      </div>

      {guardias.length > 0 && (
        <div>
          <div className="sg-font-mono mb-3 text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
            {guardias.length} guardia{guardias.length !== 1 ? "s" : ""} agregado{guardias.length !== 1 ? "s" : ""}
          </div>
          <div className="flex flex-col gap-2">
            {guardias.map((guardia, index) => (
              <div key={index} className="flex items-center justify-between border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-2.5">
                <div>
                  <div className="text-[13px] text-[var(--sg-ink)]">{guardia.email}</div>
                  {guardia.plant && <div className="mt-0.5 text-[10px] text-[var(--sg-muted)]">Planta: {guardia.plant}</div>}
                </div>
                <button type="button" onClick={() => onRemoveGuardia(index)} className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExcelImportStep({
  excelFileRef,
  excelParsing,
  excelFileName,
  excelHeaders,
  excelRawRows,
  excelMapping,
  excelValidRows,
  excelInvalidCount,
  showPreview,
  onExcelChange,
  onClearExcel,
  onMappingChange,
  onShowPreview,
  companyName,
  plantasText,
}: {
  excelFileRef: React.RefObject<HTMLInputElement | null>;
  excelParsing: boolean;
  excelFileName: string | null;
  excelHeaders: string[];
  excelRawRows: ExcelRow[];
  excelMapping: ExcelMapping;
  excelValidRows: ImportedExcelRow[];
  excelInvalidCount: number;
  showPreview: boolean;
  onExcelChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearExcel: () => void;
  onMappingChange: (field: string, column: string | null) => void;
  onShowPreview: (value: boolean) => void;
  companyName: string;
  plantasText: string;
}) {
  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 5 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Importar datos históricos</h2>
      <p className="mb-2 text-[13px] font-light text-[var(--sg-copy)]">
        Sube tu archivo Excel con registros de acceso anteriores. SmartGuard detectará las columnas automáticamente.
      </p>
      <p className="mb-7 flex items-center gap-2 text-[11px] text-[var(--sg-muted)]">
        <span className="h-px w-4 bg-[var(--sg-line)]" />
        Opcional — puedes importar datos más tarde desde el historial.
      </p>

      <input ref={excelFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onExcelChange} className="hidden" />

      {!excelFileName ? (
        <button
          onClick={() => excelFileRef.current?.click()}
          disabled={excelParsing}
          className="flex w-full flex-col items-center gap-4 border border-dashed border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-5 py-10 text-center transition-colors hover:border-[var(--sg-accent)] hover:bg-[var(--sg-panel)] disabled:opacity-60"
        >
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
          <div className="flex items-center justify-between border border-[var(--sg-accent)] bg-[rgba(200,168,75,0.06)] px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-[var(--sg-accent)]" />
              <div>
                <div className="text-[13px] font-semibold text-[var(--sg-ink)]">{excelFileName}</div>
                <div className="text-[11px] text-[var(--sg-muted)]">
                  {excelRawRows.length.toLocaleString()} filas · {excelHeaders.length} columnas detectadas
                </div>
              </div>
            </div>
            <button onClick={onClearExcel} className="shrink-0 text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="sg-font-mono mb-3 text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">Mapeo de columnas</div>
            <div className="divide-y divide-[var(--sg-line)] border border-[var(--sg-line)]">
              <div className="grid grid-cols-2 gap-4 bg-[var(--sg-panel-2)] px-4 py-2">
                <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Campo SmartGuard</span>
                <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Tu columna Excel</span>
              </div>
              {PLATFORM_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-2 items-center gap-4 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-[var(--sg-copy)]">{field.label}</span>
                    {field.required && <span className="text-[var(--sg-accent)] text-[10px]">*</span>}
                  </div>
                  <select
                    value={excelMapping[field.key] ?? ""}
                    onChange={(event) => onMappingChange(field.key, event.target.value || null)}
                    className="sg-select py-1.5 text-[12px]"
                  >
                    <option value="">(no mapear)</option>
                    {excelHeaders.map((header) => (
                      <option key={header} value={header} className="bg-[var(--sg-panel-2)]">{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {excelValidRows.length > 0 && (
            <div>
              <div className="sg-font-mono mb-3 text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">Vista previa (primeras 5 filas)</div>
              <div className="overflow-x-auto border border-[var(--sg-line)]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
                      {PREVIEW_FIELDS.filter((key) => excelMapping[key]).map((key) => {
                        const field = PLATFORM_FIELDS.find((item) => item.key === key);
                        return (
                          <th key={key} className="sg-font-mono whitespace-nowrap px-3 py-2 text-left text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                            {field?.label ?? key}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {excelValidRows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b border-[var(--sg-line)] last:border-0">
                        {PREVIEW_FIELDS.filter((key) => excelMapping[key]).map((key) => (
                          <td key={key} className="max-w-[160px] truncate whitespace-nowrap px-3 py-2 text-[var(--sg-copy)]">
                            {String(row[key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--sg-muted)]" />
            <div className="text-[12px] text-[var(--sg-copy)]">
              <span className="font-semibold text-[var(--sg-success)]">{excelValidRows.length.toLocaleString()} filas válidas</span>
              {excelInvalidCount > 0 && <span className="text-[var(--sg-muted)]"> · {excelInvalidCount} omitidas (sin fecha o razón social)</span>}
              {excelValidRows.length > 10_000 && <span className="text-[var(--sg-warn)]"> · Se importarán las primeras 10,000</span>}
            </div>
          </div>

          {!showPreview ? (
            <button
              type="button"
              onClick={() => onShowPreview(true)}
              className="sg-font-mono mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)]"
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
  );
}

export function ConfirmStep({
  companyName,
  sector,
  contactName,
  plantasText,
  email,
  notificationEmail,
  notificationPhone,
  parsedNames,
  guardias,
  excelValidRows,
  serverError,
  submitting,
  onSubmit,
}: {
  companyName: string;
  sector: string;
  contactName: string;
  plantasText: string;
  email: string;
  notificationEmail: string;
  notificationPhone: string;
  parsedNames: string[];
  guardias: { email: string; password: string; plant: string }[];
  excelValidRows: ImportedExcelRow[];
  serverError: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="sg-panel p-7 md:p-9">
      <div className="sg-kicker mb-3">Paso 6 de 6</div>
      <h2 className="sg-font-display mb-1 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Confirmar registro</h2>
      <p className="mb-7 text-[13px] font-light text-[var(--sg-copy)]">Revisa los datos antes de crear la cuenta.</p>

      <div className="mb-7 grid gap-3">
        {[
          { label: "Empresa", value: companyName },
          { label: "Sector", value: sector },
          { label: "Contacto", value: contactName },
          { label: "Plantas", value: plantasText || "No especificadas" },
          { label: "Email supervisor", value: email },
          { label: "Email alertas", value: notificationEmail || "(mismo que supervisor)" },
          { label: "WhatsApp alertas", value: notificationPhone || "No configurado" },
          { label: "Responsables", value: parsedNames.length > 0 ? `${parsedNames.length} persona${parsedNames.length !== 1 ? "s" : ""}` : "No cargados" },
          { label: "Guardias", value: guardias.length > 0 ? `${guardias.length} cuenta${guardias.length !== 1 ? "s" : ""} · ${guardias.map((guardia) => guardia.email).join(", ")}` : "No agregados" },
          { label: "Datos históricos", value: excelValidRows.length > 0 ? `${excelValidRows.length.toLocaleString()} registros a importar` : "No seleccionados" },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 border-b border-[var(--sg-line)] pb-3 sm:grid sm:grid-cols-[160px_1fr] sm:gap-4">
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

      <motion.button onClick={onSubmit} disabled={submitting} whileTap={{ scale: 0.98 }} className={`sg-btn sg-btn-accent h-12 w-full justify-center ${submitting ? "cursor-wait opacity-70" : ""}`}>
        {submitting ? (
          <span className="flex items-center gap-3">
            <motion.span
              className="inline-flex h-4 w-4 rounded-full border-2 border-[rgba(20,17,10,0.3)] border-t-[#14110a]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
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
  );
}
