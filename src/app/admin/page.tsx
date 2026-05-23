"use client";

import AppLayout from "@/components/AppLayout";
import { getAdminOverview } from "@/app/actions";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminCompaniesSection } from "./AdminCompaniesSection";
import {
  AdminHeader,
  AdminStatsGrid,
  DeleteCompanyModal,
  DeletedCompaniesSection,
  EmptyState,
} from "./AdminShared";
import type {
  AdminCompany,
  AdminFilterKey,
  AdminOverview,
  DeletedCompany,
} from "./adminTypes";
import {
  buildFilterOptions,
  buildFunnelStages,
  countHealthyCompanies,
  countTrialsExpiringSoon,
  filterCompanies,
  getOnboardingUrl,
} from "./adminUtils";

const EMPTY_COMPANIES: AdminCompany[]   = [];
const EMPTY_DELETED:   DeletedCompany[] = [];

export default function AdminPage() {
  const [data,           setData]           = useState<AdminOverview>(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [activeFilters,  setActiveFilters]  = useState<Set<AdminFilterKey>>(new Set());
  const [confirmDelete,  setConfirmDelete]  = useState<AdminCompany | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [copied,         setCopied]         = useState(false);
  const [onboardingUrl]  = useState(getOnboardingUrl);
  const router = useRouter();

  const reload = useCallback(async () => {
    const d = await getAdminOverview();
    setData(d);
  }, []);

  useEffect(() => {
    getAdminOverview().then(d => { setData(d); setLoading(false); });
  }, []);

  const companies        = useMemo(() => data?.companies        ?? EMPTY_COMPANIES, [data?.companies]);
  const deletedCompanies = useMemo(() => data?.deletedCompanies ?? EMPTY_DELETED,   [data?.deletedCompanies]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(onboardingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [onboardingUrl]);

  const filtered = useMemo(() => {
    return filterCompanies(companies, search, activeFilters);
  }, [companies, search, activeFilters]);

  const trialsExpiringSoon = useMemo(
    () => countTrialsExpiringSoon(companies),
    [companies]
  );
  const okCount = useMemo(() => countHealthyCompanies(companies), [companies]);

  const filterOptions = useMemo(
    () => buildFilterOptions(companies, activeFilters),
    [companies, activeFilters]
  );
  const funnelStages = useMemo(() => buildFunnelStages(companies), [companies]);

  const handleToggleFilter = useCallback((key: string) => {
    const filterKey = key as AdminFilterKey;
    const next = new Set(activeFilters);
    if (next.has(filterKey)) next.delete(filterKey);
    else next.add(filterKey);
    setActiveFilters(next);
  }, [activeFilters]);

  const handleImpersonateCompany = useCallback(async (companyId: string) => {
    const { startImpersonation } = await import("@/app/actions/companies");
    await startImpersonation(companyId);
    router.push("/dashboard");
  }, [router]);

  const handleReactivateCompany = useCallback(async (company: DeletedCompany) => {
    setReactivatingId(company.id);
    const { reactivateCompany } = await import("@/app/actions/companies");
    await reactivateCompany(company.id);
    await reload();
    setReactivatingId(null);
  }, [reload]);

  const handleConfirmDelete = useCallback(async (company: AdminCompany) => {
    setDeletingId(company.id);
    const { deleteCompany } = await import("@/app/actions/companies");
    await deleteCompany(company.id);
    await reload();
    setDeletingId(null);
    setConfirmDelete(null);
  }, [reload]);

  return (
    <AppLayout>
      <AdminHeader
        copied={copied}
        trialsExpiringSoon={trialsExpiringSoon}
        onCopyLink={handleCopyLink}
      />

      <AdminStatsGrid
        loading={loading}
        totalCompanies={data?.totalCompanies ?? 0}
        totalUsers={data?.totalUsers ?? 0}
        trialsExpiringSoon={trialsExpiringSoon}
        okCount={okCount}
        companiesCount={companies.length}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-[var(--sg-panel-2)]" />)}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState onCopyLink={handleCopyLink} onboardingUrl={onboardingUrl} />
      ) : (
        <AdminCompaniesSection
          companies={companies}
          filteredCompanies={filtered}
          search={search}
          filters={filterOptions}
          funnelStages={funnelStages}
          activeFilters={activeFilters}
          onSearch={setSearch}
          onToggleFilter={handleToggleFilter}
          onClearFilters={() => {
            setSearch("");
            setActiveFilters(new Set<AdminFilterKey>());
          }}
          onManageCompany={(companyId) => router.push(`/admin/${companyId}`)}
          onImpersonateCompany={handleImpersonateCompany}
          onDeleteCompany={setConfirmDelete}
        />
      )}

      <DeletedCompaniesSection
        companies={deletedCompanies}
        reactivatingId={reactivatingId}
        onReactivate={handleReactivateCompany}
      />

      <DeleteCompanyModal
        company={confirmDelete}
        deletingId={deletingId}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />

    </AppLayout>
  );
}
