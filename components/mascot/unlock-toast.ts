"use client";

import { toast } from "sonner";
import { ACCESSORIES, type AccessoryId } from "@/lib/mascot";

const toasted = new Set<string>();

function isStarter(id: string) {
  const def = ACCESSORIES[id as AccessoryId];
  return !!def?.unlock.some((rule) => rule.kind === "starter");
}

/** Non-starter ids, in catalog order. Starters are persisted without a toast. */
export function earnedUnlocks(ids: readonly string[]): AccessoryId[] {
  return ids.filter(
    (id): id is AccessoryId => id in ACCESSORIES && !isStarter(id),
  );
}

/**
 * Toast earned unlocks. Returns true when this set was shown.
 * One item: "Beanie unlocked". Several: "2 items unlocked".
 * "Wear it" opens that item in the unsaved wardrobe draft.
 */
export function toastUnlocked(
  ids: readonly string[],
  navigate: (href: string) => void,
): boolean {
  const earned = earnedUnlocks(ids);
  if (!earned.length) return false;
  const key = earned.slice().sort().join(",");
  if (toasted.has(key)) return false;
  toasted.add(key);
  const wearId = earned[0];
  const message =
    earned.length === 1
      ? `${ACCESSORIES[wearId].label} unlocked`
      : `${earned.length} items unlocked`;
  toast.success(message, {
    action: {
      label: "Wear it",
      onClick: () => navigate(`/settings?buddy=open&wear=${wearId}`),
    },
  });
  return true;
}
