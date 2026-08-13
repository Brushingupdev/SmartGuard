"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAlertLogs,
  getAlertsData,
  getCompaniesMap,
  getGuardiaEventosAlertas,
  getUserProfile,
} from "@/app/actions";
import { AnimatePresence } from "framer-motion";
import { AlertasContent } from "./AlertasContent";
import { AlertDetailModal, DayIncidentsModal } from "./AlertasModals";
import type {
  AlertDetail,
  AlertLogRow,
  AlertsData,
  GuardiaEventosAlertData,
} from "./alertasTypes";
import { EMPTY_KPIS, paginateAlertLogs } from "./alertasUtils";

export default function AlertasPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [alertLogs, setAlertLogs] = useState<AlertLogRow[]>([]);
  const [guardiaEventos, setGuardiaEventos] =
    useState<GuardiaEventosAlertData | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [userPlant, setUserPlant] = useState<string | undefined>(undefined);

  const LOGS_PAGE_SIZE = 10;

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [result, logs, eventos] = await Promise.all([
          getAlertsData(userPlant),
          getAlertLogs(userPlant),
          getGuardiaEventosAlertas(userPlant),
        ]);
        setData(result);
        setAlertLogs(logs);
        setGuardiaEventos(eventos);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [userPlant]
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const profile = await getUserProfile();
        const plant = profile?.plant ?? undefined;
        const [result, logs, eventos] = await Promise.all([
          getAlertsData(plant),
          getAlertLogs(plant),
          getGuardiaEventosAlertas(plant),
        ]);
        if (!active) return;

        setData(result);
        setAlertLogs(logs);
        setGuardiaEventos(eventos);
        setUserPlant(plant);
        setIsAdmin(Boolean(profile?.isAdmin));

        if (!profile?.isAdmin) {
          setCompaniesMap({});
          return;
        }

        const companyMap = await getCompaniesMap();
        if (active) setCompaniesMap(companyMap);
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();
    const id = setInterval(() => {
      void load(true);
    }, 60_000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [load]);

  const kpis = data?.kpis ?? EMPTY_KPIS;
  const alerts = data?.alerts ?? [];
  const histChart = data?.histChart ?? [];
  const paginated = paginateAlertLogs(alertLogs, logsPage, LOGS_PAGE_SIZE);

  return (
    <>
      <AnimatePresence>
        {selectedAlert ? (
          <AlertDetailModal
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        ) : null}
        {selectedDay && !selectedAlert ? (
          <DayIncidentsModal
            date={selectedDay}
            plant={userPlant}
            onClose={() => setSelectedDay(null)}
          />
        ) : null}
      </AnimatePresence>

      <AlertasContent
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          void load(true);
        }}
        kpis={kpis}
        alerts={alerts}
        isAdmin={isAdmin}
        companiesMap={companiesMap}
        onSelectAlert={setSelectedAlert}
        histChart={histChart}
        onSelectDay={setSelectedDay}
        guardiaEventos={guardiaEventos}
        alertLogs={paginated.rows}
        totalLogPages={paginated.totalPages}
        currentLogsPage={paginated.currentPage}
        onLogsPageChange={setLogsPage}
        asOfDate={data?.asOfDate ?? null}
      />
    </>
  );
}
