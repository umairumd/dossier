"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { awardItem, revokeAwardedItem } from "@/lib/actions/admin/awards";
import { ACCESSORIES, GRANTABLE_IDS, RARITY_STYLE, type AccessoryId } from "@/lib/mascot/catalog";
import type { AwardedItem } from "@/lib/supabase/queries/admin/awards";

/** Their saved look with one item swapped in, for the preview. */
function wearing(avatar: unknown, itemId: AccessoryId): unknown {
  const base = (avatar && typeof avatar === "object" ? avatar : {}) as {
    accessories?: Record<string, string>;
  };
  const slot = ACCESSORIES[itemId].slot;
  // A skin is the whole look, so a hat replaces it in the preview.
  const accessories = slot === "body" ? {} : { ...(base.accessories ?? {}) };
  delete accessories.body;
  accessories[slot] = itemId;
  return { ...base, accessories };
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Owners and admins: give someone an award-only buddy item, or take it back. */
export function AwardItemDialog({
  employeeId,
  name,
  avatar,
  awarded,
}: {
  employeeId: string;
  name: string;
  avatar: unknown;
  awarded: AwardedItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<AccessoryId>(GRANTABLE_IDS[0]);
  const [reason, setReason] = useState("");
  const [confirmTakeBack, setConfirmTakeBack] = useState(false);
  const [pending, startTransition] = useTransition();
  const firstName = name.split(" ")[0] ?? name;

  if (GRANTABLE_IDS.length === 0) return null;

  const def = ACCESSORIES[itemId];
  const held = awarded.find((item) => item.itemId === itemId) ?? null;

  const give = () =>
    startTransition(async () => {
      const result = await awardItem(employeeId, itemId, reason);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't award the item.");
        return;
      }
      toast.success(`${firstName} got the ${def.label}. They've been told.`);
      setReason("");
      setOpen(false);
      router.refresh();
    });

  const takeBack = () =>
    startTransition(async () => {
      const result = await revokeAwardedItem(employeeId, itemId);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't take it back.");
        return;
      }
      toast.success(`The ${def.label} was taken back.`);
      setConfirmTakeBack(false);
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmTakeBack(false);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Award className="size-4" />
          Award
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-12">
          <DialogTitle>Award an item</DialogTitle>
          <DialogDescription>
            Award-only items can&apos;t be earned. {firstName} is told, with your reason.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {GRANTABLE_IDS.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Item">
              {GRANTABLE_IDS.map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={id === itemId ? "secondary" : "outline"}
                  role="radio"
                  aria-checked={id === itemId}
                  onClick={() => {
                    setItemId(id);
                    setConfirmTakeBack(false);
                  }}
                >
                  {ACCESSORIES[id].label}
                </Button>
              ))}
            </div>
          ) : null}

          {/* The stage leaves headroom above the buddy so a tall hat isn't cut off. */}
          <div className="flex flex-col items-center gap-3 rounded-xl bg-fill-subtle px-4 pt-12 pb-4 ring-1 ring-inset ring-edge">
            <MemberAvatar
              name={name}
              userId={employeeId}
              avatar={wearing(avatar, itemId)}
              size="2xl"
              live
            />
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{def.label}</span>
                <Badge variant="neutral" style={{ color: RARITY_STYLE[def.rarity].color }}>
                  {RARITY_STYLE[def.rarity].label}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {held
                  ? `In ${firstName}'s wardrobe since ${formatDay(held.awardedAt)}`
                  : `How it looks on ${firstName}`}
              </span>
            </div>
          </div>

          {held ? (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                Awarded{held.awardedBy ? ` by ${held.awardedBy}` : ""} on {formatDay(held.awardedAt)}.
              </p>
              {held.reason ? <p className="text-muted-foreground">“{held.reason}”</p> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="award-reason">Why are you awarding it?</Label>
              <Textarea
                id="award-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. For carrying the October launch."
                maxLength={300}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{firstName} sees this in the notification.</p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {held ? (
            confirmTakeBack ? (
              <>
                <span className="self-center text-[13px] text-muted-foreground sm:mr-auto">
                  It comes off {firstName}&apos;s buddy too.
                </span>
                <Button type="button" variant="ghost" onClick={() => setConfirmTakeBack(false)} disabled={pending}>
                  Keep it
                </Button>
                <Button type="button" variant="destructive" onClick={takeBack} disabled={pending}>
                  {pending ? "Taking back…" : "Take back"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmTakeBack(true)}>
                  Take back
                </Button>
              </>
            )
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={give} disabled={pending || !reason.trim()}>
                {pending ? "Awarding…" : `Award to ${firstName}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
