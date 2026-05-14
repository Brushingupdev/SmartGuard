import type { GuardSession } from "./actions";

export type DeviceConfig = {
  companyId: string;
  companyName: string;
  plantas: string[];
};

const DEVICE_KEY = "sg-device";
const GUARD_KEY  = "sg-guard";

export function getDeviceConfig(): DeviceConfig | null {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "null"); }
  catch { return null; }
}

export function saveDeviceConfig(cfg: DeviceConfig) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(cfg));
}

export function saveGuardSession(guard: GuardSession) {
  localStorage.setItem(GUARD_KEY, JSON.stringify({ ...guard, ts: Date.now() }));
}

export function clearGuardSession() {
  localStorage.removeItem(GUARD_KEY);
}

export function getGuardSession(): (GuardSession & { ts: number }) | null {
  try { return JSON.parse(localStorage.getItem(GUARD_KEY) ?? "null"); }
  catch { return null; }
}
