"use client";

import FiltersToolbar from "@/components/FiltersToolbar";
import HealthScoreBar, { computeHealthScore } from "@/components/HealthScoreBar";
import OnboardingFunnel from "@/components/OnboardingFunnel";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import type {
  AdminCompany,
  AdminFilterKey,
  AdminFilterOption,
} from "./adminTypes";
import { easeOut, getCompanyInterventions } from "./adminUtils";
import { HealthLegend, InterventionBadge, PlanBadge } from "./AdminShared";

export function AdminCompaniesSection({
  companies,
  filteredCompanies,
  search,
  filters,
  funnelStages,
  activeFilters,
  onSearch,
  onToggleFilter,
  onClearFilters,
  onManageCompany,
  onImpersonateCompany,
  onDeleteCompany,
}: {
  companies: AdminCompany[];
  filteredCompanies: AdminCompany[];
  search: string;
  filters: AdminFilterOption[];
  funnelStages: {
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  activeFilters: Set<AdminFilterKey>;
  onSearch: (value: string) => void;
  onToggleFilter: (key: AdminFilterKey) => void;
  onClearFilters: () => void;
  onManageCompany: (companyId: string) => void;
  onImpersonateCompany: (companyId: string) => void | Promise<void>;
  onDeleteCompany: (company: AdminCompany) => void;
}) {
  return (
    <>
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <FiltersToolbar
          search={search}
          onSearch={onSearch}
          filters={filters}
          onToggle={(key) => onToggleFilter(key as AdminFilterKey)}
          onClear={onClearFilters}
        />
        <OnboardingFunnel stages={funnelStages} total={companies.length} />
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="sg-panel p-10 text-center sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
          Sin resultados para los filtros aplicados
        </div>
      ) : (
        <div className="sg-panel overflow-x-auto">
          <table className="sg-table min-w-[1000px]">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Salud</th>
                <th>Sedes</th>
                <th>Usuarios</th>
                <th>Registros</th>
                <th>30 días</th>
                <th>Última actividad</th>
                <th>Intervenciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company, index) => {
                const score = computeHealthScore({
                  hasUsers: company.users > 0,
                  hasContacts: company.hasContacts,
                  hasPlants: company.plantas.length > 0,
                  recentRecords: company.recentRecords,
                  totalRecords: company.totalRecords,
                });
                const interventions = getCompanyInterventions(company);

                return (
                  <motion.tr
                    key={company.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, ease: easeOut }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        {company.logoUrl ? (
                          <Image
                            unoptimized
                            width={28}
                            height={28}
                            src={company.logoUrl}
                            alt={company.name}
                            className="h-8 w-8 shrink-0 border border-[var(--sg-line)] bg-white p-0.5 object-contain"
                          />
                        ) : (
                          <div className="sg-font-display flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[13px] font-bold text-[var(--sg-accent)]">
                            {company.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="sg-font-display block max-w-[160px] truncate text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                            {company.name}
                          </span>
                          <span className="text-[10px] text-[var(--sg-muted)]">
                            {company.sector}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <PlanBadge
                        plan={company.plan}
                        daysLeft={company.trialDaysLeft}
                        expired={company.trialExpired}
                      />
                    </td>
                    <td>
                      <HealthScoreBar score={score} size="sm" />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                        <span className="sg-font-mono text-[12px]">
                          {company.plantas.length}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                        <span className="sg-font-mono text-[12px]">
                          {company.users}
                        </span>
                        <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
                          ({company.guardias}g · {company.supervisors}s)
                        </span>
                      </div>
                    </td>
                    <td className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                      {company.totalRecords.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`sg-font-mono text-[12px] font-bold ${company.recentRecords > 0 ? "text-[var(--sg-success)]" : "text-[var(--sg-muted)]"}`}
                      >
                        {company.recentRecords > 0
                          ? `+${company.recentRecords}`
                          : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[var(--sg-muted)]" />
                        <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                          {company.lastActivity
                            ? new Date(
                                `${company.lastActivity}T12:00:00`
                              ).toLocaleDateString("es-PE", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "Sin registros"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {interventions.map((type) => (
                          <InterventionBadge key={type} type={type} />
                        ))}
                        {interventions.length === 0 && (
                          <span className="sg-font-mono flex items-center gap-1 text-[9px] text-[var(--sg-success)]">
                            <CheckCircle2 className="h-3 w-3" /> Todo OK
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onManageCompany(company.id)}
                          className="sg-font-mono flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                          title="Gestionar empresa"
                        >
                          <Settings className="h-3 w-3" /> Gestionar
                        </button>
                        <button
                          onClick={() => onImpersonateCompany(company.id)}
                          className="sg-font-mono flex items-center gap-1.5 border border-[var(--sg-accent)] px-2 py-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-accent)] transition-colors hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)]"
                          title="Ver como supervisor"
                        >
                          <Eye className="h-3 w-3" /> Ver como
                        </button>
                        {!company.hasContacts && (
                          <a
                            href={`mailto:soporte@smartguard.io?subject=Configurar alertas - ${encodeURIComponent(company.name)}`}
                            className="flex items-center gap-1 border border-[var(--sg-line)] px-1.5 py-1.5 text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)]"
                            title="Contactar supervisor"
                          >
                            <Send className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={() => onDeleteCompany(company)}
                          className="flex items-center gap-1 border border-[var(--sg-line)] px-1.5 py-1.5 text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-danger)] hover:text-[var(--sg-danger)]"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeFilters.size >= 0 && <HealthLegend />}
    </>
  );
}
