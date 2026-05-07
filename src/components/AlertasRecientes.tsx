"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getAlertasRecientes } from "@/app/actions";
import type { AlertQueueRow } from "@/app/actions";

export function AlertasRecientes({ plant, limit = 8 }: { plant: string; limit?: number }) {
  const [alertas, setAlertas] = useState<AlertQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = () => {
      void getAlertasRecientes(plant).then(({ alertas: list }) => {
        if (!active) return;
        setAlertas((list ?? []).slice(0, limit));
        setLoading(false);
      });
    };

    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [plant, limit]);

  const statusConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
    sent:      { icon: CheckCircle2, color: "var(--sg-success)", label: "Enviada" },
    pending:   { icon: Clock,         color: "var(--sg-warn)",    label: "Pendiente" },
    failed:    { icon: XCircle,       color: "var(--sg-danger)",  label: "Falló" },
    processing:{ icon: Loader2,       color: "var(--sg-accent)",  label: "Enviando..." },
  };

  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-2.5 border-b border-[var(--sg-line)]"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--sg-muted)]" />
          <span className="sg-font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--sg-muted)]">
            Alertas de hoy
          </span>
          {!loading && (
            <span className="sg-font-mono text-[10px] text-[var(--sg-ink)] bg-[var(--sg-panel-2)] px-1.5 py-px">
              {alertas.length}
            </span>
          )}
        </div>
        <span className="text-[10px] text-[var(--sg-muted)]">
          {collapsed ? "Mostrar" : "Ocultar"}
        </span>
      </button>

      {!collapsed && (
        loading ? (
          <div className="flex items-center justify-center py-4 text-[var(--sg-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="px-4 py-3 text-[11px] text-[var(--sg-muted)]">
            Sin alertas activas hoy.
          </div>
        ) : (
          <div className="divide-y divide-[var(--sg-line)] max-h-[200px] overflow-y-auto">
            {alertas.map((a) => {
              const cfg = statusConfig[a.status] ?? statusConfig.pending;
              const StatusIcon = cfg.icon;
              const time = a.createdAt
                ? new Date(a.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
                : "—";

              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={`h-3.5 w-3.5 shrink-0 ${a.status === "processing" ? "animate-spin" : ""}`}
                        style={{ color: cfg.color }}
                      />
                      <span className="text-[12px] font-semibold text-[var(--sg-ink)] truncate">
                        {a.razonSocial}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-[22px]">
                      <span className="text-[10px] text-[var(--sg-muted)]">{a.empresa}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="sg-font-mono text-[10px] font-bold text-[var(--sg-ink)]">
                      {a.esperaMin > 0 ? `${a.esperaMin} min` : "cita"}
                    </span>
                    <span
                      className="sg-font-mono text-[9px] uppercase tracking-wider px-1.5 py-px rounded"
                      style={{ color: cfg.color, background: `${cfg.color}15` }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[9px] text-[var(--sg-muted)] w-8 text-right">{time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
