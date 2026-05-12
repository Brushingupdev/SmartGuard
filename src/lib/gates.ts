export interface GateAssignment {
  site: string;
  gate: string;
  plant: string;
}

const KNOWN_GATE_MAP: Record<string, Omit<GateAssignment, "plant">> = {
  Cajamarquilla: { site: "Cajamarquilla", gate: "Principal" },
  Sanitario: { site: "Cajamarquilla", gate: "Santuario" },
  Lomas: { site: "Lomas", gate: "Principal" },
  "Lomas 02": { site: "Lomas", gate: "Lomas 02" },
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function gateFromPlant(plant: string): GateAssignment {
  const fallback = plant.trim();
  const known = KNOWN_GATE_MAP[fallback];
  return {
    site: known?.site ?? fallback,
    gate: known?.gate ?? fallback,
    plant: fallback,
  };
}

export function normalizeGateAssignments(raw: unknown, fallbackPlants: string[] = []): GateAssignment[] {
  const seen = new Set<string>();
  const gates: GateAssignment[] = [];

  const pushGate = (gate: GateAssignment) => {
    if (!gate.plant || seen.has(gate.plant)) return;
    seen.add(gate.plant);
    gates.push(gate);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        pushGate(gateFromPlant(item));
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const source = item as Record<string, unknown>;
      const plant = clean(source.plant);
      if (!plant) continue;
      const fallback = gateFromPlant(plant);
      pushGate({
        site: clean(source.site) || fallback.site,
        gate: clean(source.gate) || fallback.gate,
        plant,
      });
    }
  }

  for (const plant of fallbackPlants) {
    pushGate(gateFromPlant(plant));
  }

  return gates;
}

export function formatGateLabel(gate: GateAssignment | null | undefined): string {
  if (!gate) return "";
  if (gate.site === gate.gate) return gate.gate;
  return `${gate.site} · ${gate.gate}`;
}

export function formatGateLabelFromPlant(plant: string, gates: GateAssignment[] = []): string {
  if (!plant || plant === "Todos") return "Todos";
  if (plant === "Sin planta") return "Sin asignar";
  const gate = gates.find((item) => item.plant === plant) ?? gateFromPlant(plant);
  return formatGateLabel(gate);
}

export function groupGatesBySite(gates: GateAssignment[]): { site: string; gates: GateAssignment[] }[] {
  const siteMap = new Map<string, GateAssignment[]>();
  for (const gate of gates) {
    const current = siteMap.get(gate.site) ?? [];
    current.push(gate);
    siteMap.set(gate.site, current);
  }
  return Array.from(siteMap.entries()).map(([site, siteGates]) => ({ site, gates: siteGates }));
}

export function plantsForSite(site: string, gates: GateAssignment[]): string[] {
  return gates.filter((gate) => gate.site === site).map((gate) => gate.plant);
}

export function getPlantsForSite(site: string): string[] {
  return Object.entries(KNOWN_GATE_MAP)
    .filter(([, g]) => g.site === site)
    .map(([plant]) => plant);
}
