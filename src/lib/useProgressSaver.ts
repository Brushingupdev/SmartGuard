"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "smartguard_onboarding";
const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes

interface SavedProgress {
  step: number;
  companyName: string;
  sector: string;
  contactName: string;
  plantasText: string;
  notificationEmail: string;
  email: string;
  logoBase64: string | null;
  logoMimeType: string | null;
  parsedNames: string[];
  guardias: { email: string; password: string; plant: string }[];
  timestamp: number;
}

export function useProgressSaver() {
  const [saved, setSaved] = useState<SavedProgress | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: SavedProgress = JSON.parse(raw);
        if (Date.now() - data.timestamp < EXPIRE_MS) {
          return data;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const save = useCallback((data: Omit<SavedProgress, "timestamp">) => {
    try {
      const toSave: SavedProgress = { ...data, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSaved(toSave);
    } catch {
      // Ignore quota errors
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
  }, []);

  return { saved, save, clear };
}
