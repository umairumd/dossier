"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { MascotStatic } from "@/components/mascot/mascot";
import { useBuddyDialog } from "@/components/layout/buddy-dialog";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Tile, TileBody, TileFooterAction, TileHeader } from "@/components/ui/tile";
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
  const { open: openBuddy, prefetch } = useBuddyDialog();
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
      prefetch();
      toast.success(`Now wearing ${ACCESSORIES[id].label}`, {
        action: {
          label: "Customise",
          onClick: () => openBuddy(),
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
    <Tile className="h-full">
      <TileHeader title="Your progress" aside={streak > 0 ? `${streak}-day streak` : undefined} />
      <TileBody className="mt-3 gap-3">
        {showingFresh && isAccessoryId(showingFresh.itemId) && (
          <div className="flex items-center gap-3 rounded-lg bg-fill-hover p-2">
            <MascotStatic
              avatar={equipAccessory(base, ACCESSORIES[showingFresh.itemId].slot, showingFresh.itemId)}
              size={48}
              alt=""
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ok">New unlock</p>
              <p className="text-sm font-semibold">{ACCESSORIES[showingFresh.itemId].label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {rewardReason(showingFresh.itemId)} · {formatDistanceToNow(new Date(showingFresh.unlockedAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              type="button"
              className="max-md:h-11"
              onClick={() => wear(showingFresh.itemId as AccessoryId)}
              onPointerEnter={prefetch}
              onFocus={prefetch}
            >
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
                <MascotStatic avatar={equipAccessory(base, ACCESSORIES[id].slot, id)} size={48} alt="" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm">
                    {showingFresh ? "Next: " : ""}
                    <span className="font-semibold">{ACCESSORIES[id].label}</span>
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground tabular-nums">{label.label}</p>
                </div>
                <Meter className="mt-1.5" value={prog.current} max={prog.target} label={label.label} />
              </div>
            </div>
          );
        })}
      </TileBody>
      <TileFooterAction
        onClick={() => openBuddy()}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      >
        Wardrobe
      </TileFooterAction>
    </Tile>
  );
}
