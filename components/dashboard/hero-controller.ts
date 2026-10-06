import type { MascotController } from "@/lib/mascot";

/** The dashboard hero registers here so the submit button can lookAt it. */
let hero: MascotController | null = null;
let skipNextResting = false;
const sheetListeners = new Set<(open: boolean) => void>();

export function registerHeroController(ctl: MascotController | null) {
  hero = ctl;
}

export function lookAtHero(target: Element) {
  hero?.lookAt(target);
}

export function setHeroSheetOpen(open: boolean) {
  for (const listener of sheetListeners) listener(open);
}

export function subscribeHeroSheet(listener: (open: boolean) => void) {
  sheetListeners.add(listener);
  return () => {
    sheetListeners.delete(listener);
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
