"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Building2, Truck } from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { isAbandonedRecord } from "@/app/registro/status";
import type { RecentRegistration } from "@/app/registro/types";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { useLiveNow } from "@/hooks/useLiveTimer";
import { fmtTime } from "./pwaSupervisorUtils";
import type { GuardiaEvento } from "@/app/actions";

export function TabInicio({
  records,
  plantas,
  eventos,
  onSelectPlanta,
}: {
  records: RecentRegistration[];
  plantas: string[];
  eventos: GuardiaEvento[];
  onSelectPlanta: (p: string) => void;
}) {
  const now = useLiveNow();
  const allPlantas =
    plantas.length > 0
      ? plantas
      : [...new Set(records.map((r) => r.planta).filter(Boolean))].sort();

  const totalPendientes = records.filter(
    (r) => !r.attended && !r.docsDelivered && r.hasArrived
  ).length;
  const totalUrgentes = records.filter((r) => isAbandonedRecord(r, now)).length;
  const urgentEvents = eventos.filter(
    (event) => event.urgente || event.tipo === "emergencia"
  ).length;
  const recentEvents = eventos.slice(0, 4);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <PushSubscribeButton variant="card" showMode="inactive" />

      <div className="flex gap-2 px-4">
        {[
          { l: "ACCESOS HOY", v: records.length, c: "var(--pwa-ink)" },
          {
            l: "PENDIENTES",
            v: totalPendientes,
            c: totalPendientes > 0 ? "var(--pwa-accent)" : "var(--pwa-muted)",
          },
          {
            l: "URGENTES",
            v: totalUrgentes,
            c: totalUrgentes > 0 ? "#d35c4f" : "var(--pwa-muted)",
          },
        ].map((stat) => (
          <div
            key={stat.l}
            className="flex flex-1 flex-col px-3 py-2.5"
            style={{ background: "var(--pwa-surface)" }}
          >
            <span
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 22,
                fontWeight: 800,
                color: stat.c,
                lineHeight: 1,
              }}
            >
              {stat.v}
            </span>
            <span
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 7,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                marginTop: 2,
              }}
            >
              {stat.l}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {totalUrgentes > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-4 overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: "rgba(211,92,79,0.1)",
                borderLeft: "3px solid #d35c4f",
              }}
            >
              <AlertTriangle
                className="h-4 w-4 shrink-0"
                style={{ color: "#d35c4f" }}
              />
              <p
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#d35c4f",
                  margin: 0,
                }}
              >
                {totalUrgentes} vehículo{totalUrgentes !== 1 ? "s" : ""} con
                +45 min sin atención
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-4 flex flex-col gap-3">
        {allPlantas.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-12"
            style={{ border: "1px dashed var(--pwa-border)" }}
          >
            <Truck
              className="h-10 w-10 opacity-10"
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
              Sin actividad hoy
            </p>
          </div>
        ) : (
          allPlantas.map((planta) => {
            const plantaRecords = records.filter((r) => r.planta === planta);
            const urgentes = plantaRecords.filter((r) =>
              isAbandonedRecord(r, now)
            ).length;
            const pendientes = plantaRecords.filter(
              (r) => !r.attended && !r.docsDelivered && r.hasArrived
            ).length;
            const activos = plantaRecords.filter(
              (r) => r.attended && !r.docsDelivered
            ).length;
            const completos = plantaRecords.filter((r) => r.docsDelivered).length;
            const total = plantaRecords.length;

            return (
              <motion.button
                key={planta}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPlanta(planta)}
                className="w-full overflow-hidden text-left"
                style={{
                  background: "var(--pwa-surface)",
                  border: `1px solid ${urgentes > 0 ? "rgba(211,92,79,0.4)" : "var(--pwa-border)"}`,
                  cursor: "pointer",
                }}
              >
                {urgentes > 0 && (
                  <motion.div
                    className="h-0.5 w-full"
                    style={{ background: "#d35c4f" }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Building2
                      className="h-4 w-4 shrink-0"
                      style={{
                        color:
                          urgentes > 0 ? "#d35c4f" : "var(--pwa-accent)",
                      }}
                    />
                    <div className="min-w-0">
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
                        {formatGateLabelFromPlant(planta)}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--pwa-muted)",
                          margin: "2px 0 0",
                        }}
                      >
                        {total} vehículo{total !== 1 ? "s" : ""} hoy
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {urgentes > 0 && (
                      <span
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#d35c4f",
                        }}
                      >
                        {urgentes} urg.
                      </span>
                    )}
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex gap-2">
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 10,
                            color: "#c4c0b4",
                          }}
                        >
                          {pendientes} pend.
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 10,
                            color: "#6ba7ff",
                          }}
                        >
                          {activos} aten.
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 10,
                            color: "#6bbd8a",
                          }}
                        >
                          {completos} ok
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <div className="mx-4">
        <div className="mb-2 flex items-center justify-between">
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              margin: 0,
            }}
          >
            Bitácora reciente
          </p>
          <span
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: urgentEvents > 0 ? "#d35c4f" : "var(--pwa-muted)",
            }}
          >
            {urgentEvents > 0
              ? `${urgentEvents} urgente${urgentEvents !== 1 ? "s" : ""}`
              : "Sin urgentes"}
          </span>
        </div>

        {recentEvents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-8"
            style={{
              background: "var(--pwa-surface)",
              border: "1px dashed var(--pwa-border)",
            }}
          >
            <AlertTriangle
              className="h-8 w-8 opacity-10"
              style={{ color: "var(--pwa-muted)" }}
            />
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
              }}
            >
              Sin eventos reportados hoy
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col"
            style={{ border: "1px solid var(--pwa-border)" }}
          >
            {recentEvents.map((event) => {
              const color =
                event.urgente || event.tipo === "emergencia"
                  ? "#d35c4f"
                  : event.tipo === "incidente"
                    ? "#d4864a"
                    : "#6ba7ff";
              return (
                <div
                  key={event.id}
                  className="flex gap-3 px-4 py-3"
                  style={{
                    borderBottom: "1px solid var(--pwa-border)",
                    background: "var(--pwa-surface)",
                  }}
                >
                  <div
                    className="w-0.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color,
                          fontWeight: 600,
                        }}
                      >
                        {event.urgente && event.tipo !== "emergencia"
                          ? `${event.tipo} · urgente`
                          : event.tipo}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 9,
                          color: "var(--pwa-muted)",
                        }}
                      >
                        {fmtTime(event.created_at.slice(11, 16))}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--sg-font-body)",
                        fontSize: 13,
                        color: "var(--pwa-ink)",
                        margin: 0,
                      }}
                    >
                      {event.descripcion}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 8,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--pwa-accent)",
                          opacity: 0.75,
                        }}
                      >
                        {formatGateLabelFromPlant(event.planta)}
                      </span>
                      {event.foto_url ? (
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 8,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--pwa-muted)",
                          }}
                        >
                          Con evidencia
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
