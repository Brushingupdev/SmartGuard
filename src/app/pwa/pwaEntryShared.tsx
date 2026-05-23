"use client";

import { Palette } from "lucide-react";
import { usePWATheme } from "@/contexts/PWAThemeContext";

export const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type PwaRole = "supervisor" | "guardia";

export function ThemeToggle() {
  const { theme, setTheme, themes } = usePWATheme();
  const nextTheme =
    themes[(themes.findIndex((item) => item.key === theme) + 1) % themes.length];

  return (
    <button
      onClick={() => setTheme(nextTheme.key)}
      className="flex h-8 w-8 items-center justify-center transition-opacity active:opacity-60"
      style={{
        background: "transparent",
        border: "none",
        color: "var(--pwa-muted)",
        cursor: "pointer",
      }}
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}

export function LogoMark({
  size = 56,
  color = "var(--pwa-accent)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
          filter: "blur(24px)",
          opacity: 0.25,
        }}
      />
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1.5px solid ${color}`,
          background: "var(--pwa-surface)",
        }}
      >
        <svg
          viewBox="0 0 32 32"
          style={{ width: size * 0.48, height: size * 0.48 }}
        >
          <path
            d="M16 2 L28 7 L28 18 C28 24 23 29 16 32 C9 29 4 24 4 18 L4 7 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="14" y="10" width="4" height="12" rx="1" fill={color} />
          <rect x="10" y="14" width="12" height="4" rx="1" fill={color} />
        </svg>
      </div>
    </div>
  );
}
