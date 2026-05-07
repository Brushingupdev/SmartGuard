"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getCitasDelDia, getRecentRegistrations } from "@/app/actions";
import type { CitaRow, RecentRegistration } from "./types";

interface UseRegistroDataParams {
  plant: string;
  initialRecentRegistrations: RecentRegistration[];
  initialRecentTotal: number;
  initialCitas: CitaRow[];
  initialLastRefresh: string;
  loadLimit: number;
  userReady?: boolean;
}

function currentRefreshTime() {
  return new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function currentLiveTime() {
  return new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useRegistroData({
  plant,
  initialRecentRegistrations,
  initialRecentTotal,
  initialCitas,
  initialLastRefresh,
  loadLimit,
  userReady = true,
}: UseRegistroDataParams) {
  const [liveTime, setLiveTime] = useState("--:--:--");
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>(initialRecentRegistrations);
  const [recentTotal, setRecentTotal] = useState(initialRecentTotal);
  const [citas, setCitas] = useState<CitaRow[]>(initialCitas);
  const [lastRefresh, setLastRefresh] = useState(initialLastRefresh);

  const plantRef = useRef(plant);
  const refreshRecentRef = useRef<((plant: string) => Promise<void>) | null>(null);
  const recentBootstrappedRef = useRef(false);
  const citasBootstrappedRef = useRef(false);

  const refreshRecent = useCallback(async (plant: string) => {
    const { records, total } = await getRecentRegistrations(plant, loadLimit, 0);
    setRecentRegistrations(records);
    setRecentTotal(total);
    setLastRefresh(currentRefreshTime());
  }, [loadLimit]);

  const refreshCitas = useCallback(async (plant: string) => {
    const rows = await getCitasDelDia(plant);
    setCitas(rows);
  }, []);

  useEffect(() => {
    const tick = () => setLiveTime(currentLiveTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    plantRef.current = plant;
  }, [plant]);

  useEffect(() => {
    refreshRecentRef.current = refreshRecent;
  }, [refreshRecent]);

  useEffect(() => {
    if (!userReady || !plant) return;
    if (!recentBootstrappedRef.current) {
      recentBootstrappedRef.current = true;
      return;
    }
    void refreshRecent(plant);
  }, [plant, refreshRecent, userReady]);

  useEffect(() => {
    if (!userReady || !plant) return;
    const id = setInterval(() => {
      void refreshRecent(plant);
    }, 90_000);
    return () => clearInterval(id);
  }, [plant, refreshRecent, userReady]);

  useEffect(() => {
    if (!userReady || !plant) return;
    if (!citasBootstrappedRef.current) {
      citasBootstrappedRef.current = true;
    } else {
      void refreshCitas(plant);
    }
    const id = setInterval(() => {
      void refreshCitas(plant);
    }, 60_000);
    return () => clearInterval(id);
  }, [plant, refreshCitas, userReady]);

  useEffect(() => {
    if (!userReady) return;

    let client: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    let mounted = true;

    void (async () => {
      const { createClient } = await import("@/utils/supabase/client");
      client = createClient();
      channel = client
        .channel("atenciones-registro-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" }, () => {
          const plant = plantRef.current;
          if (plant) {
            void refreshRecentRef.current?.(plant);
          }
        })
        .subscribe();

      if (!mounted && channel && client) {
        client.removeChannel(channel);
        channel = null;
        client = null;
      }
    })();

    return () => {
      mounted = false;
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [userReady]);

  return {
    citas,
    lastRefresh,
    liveTime,
    recentRegistrations,
    recentTotal,
    refreshCitas,
    refreshRecent,
  };
}
