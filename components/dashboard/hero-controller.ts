import type { MascotController } from "@/lib/mascot";

export type HeroPanelId = "report" | "team";

const HERO_PANEL_IDS: readonly HeroPanelId[] = ["report", "team"];

export function parseHeroPanel(value: string | undefined): HeroPanelId | null {
  if (value && (HERO_PANEL_IDS as readonly string[]).includes(value)) {
    return value as HeroPanelId;
  }
  return null;
}

/** The dashboard hero registers here so the submit button can lookAt it. */
let hero: MascotController | null = null;
let skipNextResting = false;
const panelListeners = new Set<(panel: HeroPanelId | null) => void>();

export function registerHeroController(ctl: MascotController | null) {
  hero = ctl;
}

export function lookAtHero(target: Element) {
  hero?.lookAt(target);
}

export function setHeroPanel(panel: HeroPanelId | null) {
  for (const listener of panelListeners) listener(panel);
}

export function subscribeHeroPanel(listener: (panel: HeroPanelId | null) => void) {
  panelListeners.add(listener);
  return () => {
    panelListeners.delete(listener);
  };
}

/** Sheet close after a successful submit should not snap back to "due". */
export function skipNextHeroResting() {
  skipNextResting = true;
}

export function takeSkipHeroResting() {
  const skip = skipNextResting;
  skipNextResting = false;
  return skip;
}
