import type {
  ExcelMapping,
  ExcelRow,
  ImportedExcelRow,
} from "@/utils/excel-import";
import type { ImportPreview } from "../actions/_atencionesImport";

export interface HistorialRecord {
  id: number;
  fecha: string | null;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  razon_social: string | null;
  empresa: string | null;
  company_id: string | null;
  planta: string | null;
  tipo: string | null;
  tipo_operacion: string | null;
  hora_cita?: string | null;
  motivo_demora: string | null;
  espera_min: number | null;
  demora_cita_min?: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  responsable: string | null;
  agente: string | null;
  observacion: string | null;
  es_demora: number | boolean | null;
}

export type HistorialStats = {
  total: number;
  avg: number;
  max: number;
  plants: number;
} | null;

export type HistorialSortBy = "id" | "espera_min" | "fecha";
export type HistorialSortDir = "asc" | "desc";

export type EditRecordPayload = {
  razonSocial: string;
  empresa: string;
  type: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  note: string;
  hAtencion: string | null;
  hDevDocs: string | null;
  horaCita: string | null;
};

export type HistorialImportState = {
  showImport: boolean;
  importParsing: boolean;
  importLoading: boolean;
  importFileName: string | null;
  importValidRows: ImportedExcelRow[];
  importInvalid: number;
  importMapping: ExcelMapping;
  importHeaders: string[];
  importRawRows: ExcelRow[];
  importResult: { imported: number } | null;
  importPreview: ImportPreview | null;
  importPreviewLoading: boolean;
};
