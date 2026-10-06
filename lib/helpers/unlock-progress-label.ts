// Wardrobe progress copy. Lives outside lib/mascot so the engine copy stays untouched.
import {
  ACCESSORIES,
  unlockProgress,
  type AccessoryId,
  type RewardStats,
} from "@/lib/mascot";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Wardrobe badge for a seasonal item, e.g. "Dec 1 – Jan 31". */
export function seasonWindowLabel(id: AccessoryId): string | null {
  const rule = ACCESSORIES[id].unlock.find((entry) => entry.kind === "season");
  if (!rule || rule.kind !== "season") return null;
  const [fromMonth, fromDay] = rule.from.split("-").map(Number);
  const [toMonth, toDay] = rule.to.split("-").map(Number);
  if (fromMonth === toMonth) {
    return `${MONTHS[fromMonth - 1]} ${fromDay} – ${toDay}`;
  }
  return `${MONTHS[fromMonth - 1]} ${fromDay} – ${MONTHS[toMonth - 1]} ${toDay}`;
}

export function unlockProgressLabel(
  id: AccessoryId,
  stats: RewardStats,
): { value: number; label: string } | null {
  const prog = unlockProgress(id, stats);
  if (!prog || prog.target <= 0) return null;
  const current = Math.min(Math.round(prog.current), prog.target);
  const rule = ACCESSORIES[id].unlock.find((entry) => {
    switch (entry.kind) {
      case "streak":
      case "onTimeStreak":
      case "tenureDays":
      case "teamCompleteDays":
        return entry.days === prog.target;
      case "onTimeReports":
      case "totalReports":
      case "perfectWeeks":
      case "perfectMonths":
        return entry.count === prog.target;
      case "firstReport":
        return prog.target === 1;
      default:
        return false;
    }
  });
  const word =
    rule?.kind === "streak" ||
    rule?.kind === "onTimeStreak" ||
    rule?.kind === "tenureDays" ||
    rule?.kind === "teamCompleteDays"
      ? "day"
      : rule?.kind === "perfectWeeks"
        ? "week"
        : rule?.kind === "perfectMonths"
          ? "month"
          : rule?.kind === "firstReport" ||
              rule?.kind === "onTimeReports" ||
              rule?.kind === "totalReports"
            ? "report"
            : "";
  const unit = word ? (prog.target === 1 ? word : `${word}s`) : "";
  return {
    value: (current / prog.target) * 100,
    label: unit
      ? `${current} / ${prog.target} ${unit}`
      : `${current} / ${prog.target}`,
  };
}
