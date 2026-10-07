"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { MascotStatic } from "@/components/mascot/mascot";
import { Button } from "@/components/ui/button";
import { markUnlockSeen, saveMyAvatar, type UnlockRow } from "@/lib/actions/avatar";
import { unlockProgressLabel } from "@/lib/helpers/unlock-progress-label";
import {
  ACCESSORIES,
  ACCESSORY_IDS,
  SET_ASIDE,
  equipAccessory,
  sanitizeAvatar,
  unlockProgress,
  type AccessoryId,
  type RewardStats,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";

const eyebrow =
  "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function isAccessoryId(id: string): id is AccessoryId {
  return Object.prototype.hasOwnProperty.call(ACCESSORIES, id);
}

function skipped(id: AccessoryId): boolean {
  const def = ACCESSORIES[id];
  if (def.rarity === "starter" || def.rarity === "seasonal") return true;
  if (def.unlock.some((rule) => rule.kind === "starter" || rule.kind === "season")) return true;
  return SET_ASIDE.accessories.includes(id);
}

function rewardReason(id: AccessoryId): string {
  const rule = ACCESSORIES[id].unlock[0];
  if (!rule) return ACCESSORIES[id].hint;
  switch (rule.kind) {
    case "streak":
      return `for a ${rule.days}-day streak`;
    case "onTimeStreak":
      return `for ${rule.days} on-time days in a row`;
    case "onTimeReports":
      return `for ${rule.count} on-time reports`;
    case "totalReports":
      return `for ${rule.count} reports`;
    case "firstReport":
      return "for your first report";
    case "perfectWeeks":
      return `for ${rule.count} perfect weeks`;
    case "perfectMonths":
      return `for ${rule.count} perfect months`;
    case "tenureDays":
      return rule.days >= 365 ? "for a year here" : `for ${rule.days} days here`;
    case "teamCompleteDays":
      return `for ${rule.days} days with the whole team in`;
    case "birthday":
      return "for your birthday";
    default:
      return ACCESSORIES[id].hint;
  }
}

function unseenUnlock(unlocks: UnlockRow[], asOf: string): UnlockRow | null {
  const cutoff = new Date(asOf).getTime() - FOURTEEN_DAYS;
  for (const row of unlocks) {
    if (row.seenAt) continue;
    if (new Date(row.unlockedAt).getTime() < cutoff) continue;
    if (!isAccessoryId(row.itemId) || skipped(row.itemId)) continue;
    return row;
  }
  return null;
}

function closestLocked(stats: RewardStats, owned: Set<string>, limit: number): AccessoryId[] {
  const ranked: { id: AccessoryId; ratio: number; left: number }[] = [];
  for (const id of ACCESSORY_IDS) {
    if (skipped(id) || owned.has(id)) continue;
    const prog = unlockProgress(id, stats);
    if (!prog || prog.target <= 0 || prog.current >= prog.target) continue;
    ranked.push({ id, ratio: prog.current / prog.target, left: prog.target - prog.current });
  }
  ranked.sort((a, b) => b.ratio - a.ratio || a.left - b.left);
  return ranked.slice(0, limit).map((item) => item.id);
}

export function HeroProgressTile({
  userId,
  avatar,
  stats,
  unlocks,
  asOf,
}: {
  userId: string;
  avatar: unknown;
  stats: RewardStats;
  unlocks: UnlockRow[];
  asOf: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const owned = new Set(unlocks.map((row) => row.itemId));
  const fresh = unseenUnlock(unlocks, asOf);
  const showingFresh = fresh && fresh.itemId !== dismissed ? fresh : null;
  const nextIds = closestLocked(stats, owned, showingFresh ? 1 : 2);
  const base = sanitizeAvatar(avatar, userId);
  const streak = stats.currentStreak;

  function wear(id: AccessoryId) {
    const next = equipAccessory(base, ACCESSORIES[id].slot, id);
    startTransition(async () => {
      const result = await saveMyAvatar(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await markUnlockSeen(id);
      setDismissed(id);
      toast.success(`Now wearing ${ACCESSORIES[id].label}`, {
        action: {
          label: "Customise",
          onClick: () => router.push("/settings?buddy=open"),
        },
      });
      router.refresh();
    });
  }

  function dismiss(id: string) {
    setDismissed(id);
    startTransition(() => markUnlockSeen(id));
  }

  return (
    <section className="flex h-full flex-col rounded-xl bg-foreground/[0.03] p-[18px] ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className={eyebrow}>Your progress</h2>
        {streak > 0 && (
          <p className="text-xs text-muted-foreground">{streak}-day streak</p>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-3">
        {showingFresh && isAccessoryId(showingFresh.itemId) && (
          <div className="flex items-center gap-3 rounded-lg bg-foreground/[0.04] p-2">
            <MascotStatic
              avatar={equipAccessory(base, ACCESSORIES[showingFresh.itemId].slot, showingFresh.itemId)}
              size={46}
              alt=""
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">New unlock</p>
              <p className="text-sm font-semibold">{ACCESSORIES[showingFresh.itemId].label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {rewardReason(showingFresh.itemId)} · {formatDistanceToNow(new Date(showingFresh.unlockedAt), { addSuffix: true })}
              </p>
            </div>
            <Button type="button" size="sm" className="max-md:min-h-11" onClick={() => wear(showingFresh.itemId as AccessoryId)}>
              Wear it
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Dismiss unlock"
              className="max-md:size-11"
              onClick={() => dismiss(showingFresh.itemId)}
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
        {nextIds.map((id) => {
          const prog = unlockProgress(id, stats);
          const label = unlockProgressLabel(id, stats);
          if (!prog || !label) return null;
          return (
            <div key={id} className="flex items-center gap-3">
              <span className="opacity-45">
                <MascotStatic avatar={equipAccessory(base, ACCESSORIES[id].slot, id)} size={46} alt="" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm">
                    {showingFresh ? "Next: " : ""}
                    <span className="font-semibold">{ACCESSORIES[id].label}</span>
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">{label.label}</p>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                  <div
                    className="h-full bg-foreground/70"
                    style={{ width: `${Math.round((prog.current / prog.target) * 1000) / 10}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!showingFresh && (
        <Link
          href="/settings?buddy=open"
          className={cn(
            "mt-3 self-start text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline max-md:min-h-11 max-md:inline-flex max-md:items-center",
          )}
        >
          Wardrobe →
        </Link>
      )}
    </section>
  );
}
