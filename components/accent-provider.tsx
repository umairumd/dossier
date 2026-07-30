"use client";

import { createContext, useContext, useState } from "react";

export const ACCENT_PRESETS = [
  "neutral",
  "blue",
  "green",
  "violet",
  "orange",
  "rose",
] as const;

export type Accent = (typeof ACCENT_PRESETS)[number];

export const ACCENT_STORAGE_KEY = "inoma-accent";
const DEFAULT_ACCENT: Accent = "neutral";

function isAccent(value: string | null): value is Accent {
  return !!value && (ACCENT_PRESETS as readonly string[]).includes(value);
}

interface AccentContextValue {
  accent: Accent;
  setAccent: (accent: Accent) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer (not an effect): the blocking script in app/layout.tsx
  // already set the DOM attribute before hydration, so this just reads it
  // back on first render — no post-mount setState/cascading render needed.
  const [accent, setAccentState] = useState<Accent>(() => {
    if (typeof document === "undefined") {
      return DEFAULT_ACCENT;
    }
    const current = document.documentElement.getAttribute("data-accent");
    return isAccent(current) ? current : DEFAULT_ACCENT;
  });

  const setAccent = (next: Accent) => {
    setAccentState(next);
    document.documentElement.setAttribute("data-accent", next);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
  };

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  const context = useContext(AccentContext);
  if (!context) {
    throw new Error("useAccent must be used within an AccentProvider");
  }
  return context;
}
