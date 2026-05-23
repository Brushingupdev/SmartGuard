"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type PWATheme = "dark" | "light" | "carbon";

const THEMES: { key: PWATheme; label: string }[] = [
  { key: "dark",   label: "Oscuro"   },
  { key: "light",  label: "Claro"    },
  { key: "carbon", label: "Carbon"   },
];

interface ThemeContextValue {
  theme: PWATheme;
  setTheme: (t: PWATheme) => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  themes: THEMES,
});

function getStoredTheme(): PWATheme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("sg-pwa-theme") as PWATheme | null;
  return stored && THEMES.some((t) => t.key === stored) ? stored : "dark";
}

export function PWAThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<PWATheme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-pwa-theme", theme);
  }, [theme]);

  const setTheme = (t: PWATheme) => {
    setThemeState(t);
    localStorage.setItem("sg-pwa-theme", t);
    document.documentElement.setAttribute("data-pwa-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const usePWATheme = () => useContext(ThemeContext);
