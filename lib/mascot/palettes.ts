/**
 * Curated palettes. Each is a 3-stop radial gradient (light → mid → dark),
 * matching the legacy BotAvatar look. The first six are the legacy palettes in
 * the same order (kept for reference; defaults now pick from all 12 palettes).
 */
export interface Palette {
  id: PaletteId;
  label: string;
  light: string;
  mid: string;
  dark: string;
}

export const PALETTE_IDS = [
  "sky", "iris", "mint", "rose", "honey", "slate",
  "coral", "lagoon", "lilac", "peach", "forest", "graphite",
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const PALETTES: Record<PaletteId, Palette> = {
  // legacy six (order matters for defaults)
  sky: { id: "sky", label: "Sky", light: "#a8d8ff", mid: "#5ba3e8", dark: "#1a5ca8" },
  iris: { id: "iris", label: "Iris", light: "#c8b8ff", mid: "#8b72e8", dark: "#4230b0" },
  mint: { id: "mint", label: "Mint", light: "#90ecd0", mid: "#3dbf9a", dark: "#107858" },
  rose: { id: "rose", label: "Rose", light: "#ffb8d0", mid: "#e8729e", dark: "#a82858" },
  honey: { id: "honey", label: "Honey", light: "#ffd890", mid: "#e8b030", dark: "#9a5e08" },
  slate: { id: "slate", label: "Slate", light: "#b0c4d8", mid: "#7890a8", dark: "#385878" },
  // new six
  coral: { id: "coral", label: "Coral", light: "#ffc2ad", mid: "#f2785a", dark: "#a8341c" },
  lagoon: { id: "lagoon", label: "Lagoon", light: "#9eeaf2", mid: "#2fb8c9", dark: "#0b6878" },
  lilac: { id: "lilac", label: "Lilac", light: "#f0c8ff", mid: "#c27ae8", dark: "#7a2ea8" },
  peach: { id: "peach", label: "Peach", light: "#ffe2c4", mid: "#f5b07a", dark: "#b86a2e" },
  forest: { id: "forest", label: "Forest", light: "#bfe8a8", mid: "#6fb050", dark: "#2f6a1c" },
  graphite: { id: "graphite", label: "Graphite", light: "#d0d4da", mid: "#8a9099", dark: "#3a3f47" },
};

/** Legacy order used by the old hash → palette mapping. */
export const LEGACY_PALETTE_ORDER: PaletteId[] = ["sky", "iris", "mint", "rose", "honey", "slate"];
