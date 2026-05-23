"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  FileCheck2,
  Search,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { fmtLiveWait, getWaitSeconds, useLiveNow } from "@/hooks/useLiveTimer";
import type { RecentRegistration } from "@/app/registro/types";
import {
  getLevel,
  getWaitMin,
  LEVEL_CFG,
} from "./pwaSupervisorUtils";

export function TabVehiculos({
  records,
  filterPlant,
  onFilterChange,
  onTap,
  onAction,
  onDocs,
}: {
  records: RecentRegistration[];
  filterPlant: string;
  onFilterChange: (p: string) => void;
  onTap: (r: RecentRegistration) => void;
  onAction: (r: RecentRegistration) => void;
  onDocs: (r: RecentRegistration) => void;
}) {
  const now = useLiveNow();
  const [searchTerm, setSearchTerm] = useState("");
  const allPlantas = [...new Set(records.map((r) => r.planta).filter(Boolean))].sort();
  const term = searchTerm.trim().toUpperCase();
  const filtered = records.filter((record) => {
    const matchesPlant =
      filterPlant === "Todos" || record.planta === filterPlant;
    if (!matchesPlant) return false;
    if (!term) return true;

    const searchable = [
      record.razonSocial,
      record.empresa,
      record.planta,
      formatGateLabelFromPlant(record.planta ?? ""),
      record.responsable,
      record.agente,
      record.time,
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();

    return searchable.includes(term);
  });

  const emptyTitle =
    term || filterPlant !== "Todos" ? "Sin coincidencias" : "Sin vehículos";
  const emptyDetail = term
    ? "Ajusta la búsqueda o cambia de puerta"
    : filterPlant !== "Todos"
      ? `No hay registros activos en ${formatGateLabelFromPlant(filterPlant)}`
      : "Los registros del día aparecerán aquí";

  const sorted = filtered
    .map((record) => ({
      record,
      level: getLevel(record, now),
      wm: getWaitMin(record),
    }))
    .sort(
      (a, b) =>
        LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.wm - a.wm
    );

  return (
    <div className="mt-4 flex flex-col gap-3">
      {allPlantas.length > 1 && (
        <div className="overflow-x-auto px-4 pb-1">
          <div className="flex gap-2">
            {["Todos", ...allPlantas].map((plant) => (
              <button
                key={plant}
                onClick={() => onFilterChange(plant)}
                className="shrink-0 px-3 py-1.5 transition-all"
                style={{
                  background:
                    filterPlant === plant
                      ? "var(--pwa-accent)"
                      : "var(--pwa-surface-2)",
                  border: `1px solid ${filterPlant === plant ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                  color:
                    filterPlant === plant
                      ? "var(--pwa-accent-fg)"
                      : "var(--pwa-muted)",
                  cursor: "pointer",
                  borderRadius: 999,
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: filterPlant === plant ? 700 : 400,
                }}
              >
                {plant === "Todos"
                  ? "Todos"
                  : formatGateLabelFromPlant(plant)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        <div
          className="flex min-h-11 items-center gap-2 px-3"
          style={{
            background: "var(--pwa-surface-2)",
            border: "1px solid var(--pwa-border)",
          }}
        >
          <Search
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--pwa-muted)" }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar empresa, puerta o responsable"
            className="h-11 flex-1 bg-transparent outline-none"
            style={{
              color: "var(--pwa-ink)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--pwa-muted)",
              }}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-4" style={{ border: "1px solid var(--pwa-border)" }}>
        {sorted.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-12"
            style={{ background: "var(--pwa-surface)" }}
          >
            <Truck
              className="h-8 w-8 opacity-10"
              style={{ color: "var(--pwa-muted)" }}
            />
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
              }}
            >
              {emptyTitle}
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              {emptyDetail}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sorted.map(({ record, level }) => {
              const cfg = LEVEL_CFG[level];
              const waitSecs = getWaitSeconds(record.time, now);
              return (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onClick={() => onTap(record)}
                  className="flex cursor-pointer gap-0 active:opacity-80"
                  style={{
                    background: cfg.bg,
                    borderBottom: "1px solid var(--pwa-border)",
                  }}
                >
                  <div
                    className="w-1 shrink-0"
                    style={{ background: cfg.color }}
                  />
                  <div className="flex flex-1 items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: "var(--sg-font-display)",
                          fontSize: 14,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--pwa-ink)",
                          margin: 0,
                        }}
                      >
                        {record.razonSocial}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {record.planta && (
                          <span
                            style={{
                              fontFamily: "var(--sg-font-mono)",
                              fontSize: 9,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--pwa-accent)",
                              opacity: 0.7,
                            }}
                          >
                            {formatGateLabelFromPlant(record.planta)}
                          </span>
                        )}
                        {record.responsable && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              fontFamily: "var(--sg-font-mono)",
                              fontSize: 9,
                              color: "var(--pwa-muted)",
                            }}
                          >
                            <UserCheck className="h-3 w-3" />
                            {record.responsable.split(" ")[0]}
                          </span>
                        )}
                        {record.agente && (
                          <span
                            style={{
                              fontFamily: "var(--sg-font-mono)",
                              fontSize: 9,
                              color: "var(--pwa-muted)",
                              opacity: 0.7,
                            }}
                          >
                            {record.agente.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {!record.docsDelivered ? (
                        <div className="flex items-center gap-1.5">
                          <motion.div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: cfg.color }}
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                          <span
                            style={{
                              fontFamily: "var(--sg-font-mono)",
                              fontSize: 12,
                              fontWeight: 800,
                              color: cfg.color,
                            }}
                          >
                            {fmtLiveWait(waitSecs)}
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 11,
                            color: "var(--pwa-muted)",
                          }}
                        >
                          {record.time}
                        </span>
                      )}
                      {level === "completo" ? (
                        <span
                          className="flex items-center gap-1"
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 8,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#6bbd8a",
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      ) : level === "atendido" ? (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDocs(record);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5"
                          style={{
                            background: "rgba(107,167,255,0.15)",
                            border: "1px solid rgba(107,167,255,0.4)",
                            color: "#6ba7ff",
                            cursor: "pointer",
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          <FileCheck2 className="h-3 w-3" /> Docs
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAction(record);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5"
                          style={{
                            background:
                              level === "urgente"
                                ? "rgba(211,92,79,0.15)"
                                : "var(--pwa-surface-2)",
                            border: `1px solid ${level === "urgente" ? "rgba(211,92,79,0.4)" : "var(--pwa-border)"}`,
                            color:
                              level === "urgente"
                                ? "#d35c4f"
                                : "var(--pwa-ink-soft)",
                            cursor: "pointer",
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Atendí
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
