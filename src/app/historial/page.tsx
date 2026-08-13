"use client";

import AppLayout from "@/components/AppLayout";
import { useCallback, useEffect, useState } from "react";
import {
  getAtenciones,
  getAtencionesForExport,
  getCompanies,
  getCompaniesMap,
  getHistorialStats,
  getUserPlants,
  getUserProfile,
} from "../actions";
import {
  deleteAtencion,
  importAtenciones,
  previewImportAtenciones,
  updateAtencion,
} from "../actions/atenciones";
import type { ImportPreview } from "../actions/_atencionesImport";
import {
  prepareExcelImport,
  processRows,
  type ExcelMapping,
  type ExcelRow,
  type ImportedExcelRow,
} from "@/utils/excel-import";
import { HistorialContent } from "./HistorialContent";
import {
  EditRecordModal,
  HistorialImportModal,
  RecordDetailModal,
} from "./HistorialModals";
import {
  type EditRecordPayload,
  type HistorialRecord,
  type HistorialSortBy,
  type HistorialSortDir,
  type HistorialStats,
} from "./historialTypes";
import { exportCSV } from "./historialUtils";

export default function HistorialPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [companiesList, setCompaniesList] = useState<
    { id: string; name: string }[]
  >([]);
  const [filterCompany, setFilterCompany] = useState("");

  const [search, setSearch] = useState("");
  const [plant, setPlant] = useState("Todos");
  const [plants, setPlants] = useState<string[]>([]);
  const [segment, setSegment] = useState("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const perPage = 12;

  const [records, setRecords] = useState<HistorialRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [stats, setStats] = useState<HistorialStats>(null);
  const [sortBy, setSortBy] = useState<HistorialSortBy>("id");
  const [sortDir, setSortDir] = useState<HistorialSortDir>("desc");

  const [selectedRecord, setSelectedRecord] = useState<HistorialRecord | null>(
    null
  );
  const [editingRecord, setEditingRecord] = useState<HistorialRecord | null>(
    null
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importParsing, setImportParsing] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importValidRows, setImportValidRows] = useState<ImportedExcelRow[]>(
    []
  );
  const [importInvalid, setImportInvalid] = useState(0);
  const [importMapping, setImportMapping] = useState<ExcelMapping>({});
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRawRows, setImportRawRows] = useState<ExcelRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(
    null
  );
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);

  const activeFilters = [
    plant !== "Todos",
    segment !== "Todos",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await getAtenciones({
        page,
        search,
        perPage,
        plant,
        segment,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
        filterCompanyId: filterCompany,
      });
      setRecords(data || []);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    perPage,
    plant,
    segment,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
    filterCompany,
  ]);

  useEffect(() => {
    getHistorialStats().then(setStats);
    getUserPlants().then(setPlants);
    getUserProfile().then((profile) => {
      setUserRole(profile?.role ?? null);
      if (profile?.isAdmin) {
        setIsAdmin(true);
        getCompaniesMap().then(setCompaniesMap);
        getCompanies().then((list) =>
          setCompaniesList(list as { id: string; name: string }[])
        );
      }
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchRecords, 280);
    return () => clearTimeout(timeout);
  }, [fetchRecords]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const canEditRecords = Boolean(userRole && userRole !== "guardia");

  const toggleSortFecha = () => {
    if (sortBy !== "fecha") {
      setSortBy("fecha");
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy("id");
      setSortDir("desc");
    }
    setPage(1);
  };

  const toggleSortEspera = () => {
    if (sortBy !== "espera_min") {
      setSortBy("espera_min");
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy("id");
      setSortDir("desc");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setPlant("Todos");
    setSegment("Todos");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
    setSortBy("id");
    setSortDir("desc");
    setFilterCompany("");
  };

  const handleExport = async () => {
    setExporting(true);
    const rows = await getAtencionesForExport(
      search,
      plant,
      segment,
      dateFrom,
      dateTo,
      sortBy,
      sortDir
    );
    exportCSV(rows);
    setExporting(false);
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportParsing(true);
    setImportResult(null);
    setImportPreview(null);

    try {
      const XLSX = await import("@e965/xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: false,
      });
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          raw: true,
          defval: null,
        }) as ExcelRow[],
      }));
      const prepared = prepareExcelImport(sheets, file.name);

      if (!prepared || prepared.headers.length === 0) {
        alert(
          "No se encontró una hoja con datos válidos. Verifica que el Excel tenga columnas Fecha y Razón Social."
        );
        setImportParsing(false);
        return;
      }

      setImportFileName(file.name);
      setImportHeaders(prepared.headers);
      setImportRawRows(prepared.rows);
      setImportMapping(prepared.mapping);
      setImportValidRows(prepared.valid);
      setImportInvalid(prepared.invalid);

      if (prepared.valid.length > 0) {
        setImportPreviewLoading(true);
        const previewResult = await previewImportAtenciones(prepared.valid);
        setImportPreviewLoading(false);
        if (previewResult.preview) {
          setImportPreview(previewResult.preview);
        }
      }
    } catch {
      alert(
        "No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido."
      );
    }

    setImportParsing(false);
  };

  const handleMappingChange = (field: string, col: string | null) => {
    const nextMapping = { ...importMapping, [field]: col };
    setImportMapping(nextMapping);
    const { valid, invalid } = processRows(
      importRawRows,
      importHeaders,
      nextMapping
    );
    setImportValidRows(valid);
    setImportInvalid(invalid);
  };

  const handleImportConfirm = async () => {
    if (!importValidRows.length) return;
    setImportLoading(true);
    const result = await importAtenciones(importValidRows);
    setImportLoading(false);
    if (result.success) {
      setImportResult({ imported: result.imported });
      setImportValidRows([]);
      setImportFileName(null);
      void fetchRecords();
    } else {
      alert(result.error ?? "Error al importar");
    }
  };

  const resetImportFileState = () => {
    setImportFileName(null);
    setImportValidRows([]);
    setImportInvalid(0);
    setImportPreview(null);
  };

  const closeImport = () => {
    setShowImport(false);
    setImportFileName(null);
    setImportValidRows([]);
    setImportInvalid(0);
    setImportResult(null);
    setImportPreview(null);
    setImportPreviewLoading(false);
  };

  const handleEditSave = async (
    record: HistorialRecord,
    data: EditRecordPayload
  ) => {
    setSavingEdit(true);
    const result = await updateAtencion(record.id, data);
    setSavingEdit(false);
    if (!result.success) {
      alert(result.error ?? "No se pudo actualizar el registro");
      return;
    }
    setEditingRecord(null);
    setSelectedRecord(null);
    void fetchRecords();
  };

  const handleDeleteRecord = async (record: HistorialRecord) => {
    const confirmed = window.confirm(
      `¿Eliminar el registro #${record.id} de ${record.razon_social ?? "este vehículo"}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingRecord(true);
    const result = await deleteAtencion(record.id);
    setDeletingRecord(false);

    if (!result.success) {
      alert(result.error ?? "No se pudo eliminar el registro");
      return;
    }

    setEditingRecord(null);
    setSelectedRecord(null);
    void fetchRecords();
  };

  return (
    <AppLayout>
      {selectedRecord ? (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      ) : null}

      {editingRecord ? (
        <EditRecordModal
          record={editingRecord}
          saving={savingEdit}
          deleting={deletingRecord}
          onCancel={() => setEditingRecord(null)}
          onSave={handleEditSave}
          onDelete={handleDeleteRecord}
        />
      ) : null}

      <HistorialImportModal
        open={showImport}
        importParsing={importParsing}
        importLoading={importLoading}
        importFileName={importFileName}
        importValidRows={importValidRows}
        importInvalid={importInvalid}
        importMapping={importMapping}
        importHeaders={importHeaders}
        importResult={importResult}
        importPreview={importPreview}
        importPreviewLoading={importPreviewLoading}
        onClose={closeImport}
        onFileChange={handleImportFile}
        onMappingChange={handleMappingChange}
        onImportConfirm={handleImportConfirm}
        onResetFile={resetImportFileState}
      />

      <HistorialContent
        userRole={userRole}
        stats={stats}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        plant={plant}
        plants={plants}
        onPlantChange={(value) => {
          setPlant(value);
          setPage(1);
        }}
        segment={segment}
        onSegmentChange={(value) => {
          setSegment(value);
          setPage(1);
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((value) => !value)}
        activeFilters={activeFilters}
        onResetFilters={resetFilters}
        canEditRecords={canEditRecords}
        onOpenImport={() => setShowImport(true)}
        onExport={handleExport}
        exporting={exporting}
        loading={loading}
        isAdmin={isAdmin}
        filterCompany={filterCompany}
        companiesList={companiesList}
        onFilterCompanyChange={(value) => {
          setFilterCompany(value);
          setPage(1);
        }}
        records={records}
        companiesMap={companiesMap}
        onSelectRecord={setSelectedRecord}
        onEditRecord={setEditingRecord}
        sortBy={sortBy}
        sortDir={sortDir}
        onToggleSortFecha={toggleSortFecha}
        onToggleSortEspera={toggleSortEspera}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}
