"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { MascotStatic } from "@/components/mascot/mascot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { saveMyAvatar } from "@/lib/actions/avatar";
import {
  seasonWindowLabel,
  unlockProgressLabel,
} from "@/lib/helpers/unlock-progress-label";
import {
  ACCESSORIES,
  ACCESSORY_IDS,
  ACTIVE_CHEEKS,
  ACTIVE_EYE_STYLES,
  ACTIVE_SHAPES,
  EYE_SIZE_RANGE,
  EYE_SPACING_RANGE,
  EYE_STYLES,
  PALETTES,
  PALETTE_IDS,
  RARITY_STYLE,
  SET_ASIDE,
  SHAPES,
  SPILL_LIVE,
  avatarKey,
  defaultAvatar,
  equipAccessory,
  isWearable,
  randomAvatar,
  sanitizeAvatar,
  type AccessoryId,
  type AccessorySlot,
  type AvatarConfig,
  type CheekStyle,
  type Rarity,
  type RewardStats,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";

const LiveMascot = dynamic(
  () => import("@/components/mascot/mascot").then((mod) => mod.Mascot),
  { ssr: false },
);

const PREVIEW_PX = 160;

const SLOT_ORDER: AccessorySlot[] = ["head", "face", "neck", "body"];
const SLOT_LABEL: Record<AccessorySlot, string> = {
  head: "Head",
  face: "Face",
  neck: "Neck",
  body: "Body",
};
const CHEEK_LABEL: Record<CheekStyle, string> = {
  none: "None",
  soft: "Soft",
  rosy: "Rosy",
  freckles: "Freckles",
};
const OFFERED_ACCESSORIES = ACCESSORY_IDS.filter(
  (id) => !SET_ASIDE.accessories.includes(id),
);

const RARITY_RANK: Record<Rarity, number> = {
  starter: 0,
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  special: 5,
  seasonal: 6,
};

function byWardrobeOrder(a: AccessoryId, b: AccessoryId) {
  const rank = RARITY_RANK[ACCESSORIES[a].rarity] - RARITY_RANK[ACCESSORIES[b].rarity];
  if (rank !== 0) return rank;
  return ACCESSORY_IDS.indexOf(a) - ACCESSORY_IDS.indexOf(b);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** avatarKey omits reaction. Poke choice is no longer part of the draft. */
function recipeKey(avatar: AvatarConfig) {
  return avatarKey(avatar);
}

const SEEN_KEY = "dossier-buddy-seen-unlocks";
const SEEN_EVENT = "dossier-buddy-seen-unlocks";

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parseSeen(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

function markUnlockSeen(id: string) {
  try {
    const ids = [...parseSeen(readSeen())];
    if (ids.includes(id)) return;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids, id]));
    window.dispatchEvent(new Event(SEEN_EVENT));
  } catch {
    // Storage blocked: the dot stays for this visit.
  }
}

function equippableWear(
  wear: string | undefined,
  ownedIds: readonly string[],
  now: Date,
  timeZone: string,
): AccessoryId | null {
  if (!wear || !(ACCESSORY_IDS as readonly string[]).includes(wear)) return null;
  const id = wear as AccessoryId;
  if (!isWearable(id, new Set(ownedIds), now, timeZone)) return null;
  return id;
}

function isStarter(id: AccessoryId) {
  return ACCESSORIES[id].unlock.some((rule) => rule.kind === "starter");
}

function withWornItem(base: AvatarConfig, id: AccessoryId | null): AvatarConfig {
  if (!id) return base;
  return equipAccessory(base, ACCESSORIES[id].slot, id);
}

/** One item on the person's shape and colour, with no other gear or skin. */
function itemPreview(draft: AvatarConfig, id: AccessoryId): AvatarConfig {
  return equipAccessory(
    { ...draft, accessories: {} },
    ACCESSORIES[id].slot,
    id,
  );
}

export function CustomiseBuddyDialog({
  open,
  onOpenChange,
  userId,
  avatar,
  ownedIds,
  stats,
  timeZone,
  nowIso,
  wear,
  fromQuery = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  avatar: unknown;
  ownedIds: string[];
  stats: RewardStats;
  timeZone: string;
  /** Server instant, so seasonal windows match between render and hydration. */
  nowIso: string;
  /** `?wear=` equips this item in the draft. Save stays manual. */
  wear?: string;
  /** `?buddy=open` or `?wear=` arrived on this page. */
  fromQuery?: boolean;
}) {
  const router = useRouter();
  const ignoreDiscard = useRef(false);
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const initial = useMemo(
    () => sanitizeAvatar(avatar, userId),
    [avatar, userId],
  );
  const equippedWear = useMemo(
    () => equippableWear(wear, ownedIds, now, timeZone),
    [wear, ownedIds, now, timeZone],
  );
  const worn = useMemo(
    () => withWornItem(initial, equippedWear),
    [initial, equippedWear],
  );
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(worn);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeen, () => "[]");
  const seen = useMemo(() => {
    const ids = parseSeen(seenRaw);
    if (equippedWear) ids.add(equippedWear);
    return ids;
  }, [seenRaw, equippedWear]);
  const [liveReady, setLiveReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const owned = useMemo(() => new Set(ownedIds), [ownedIds]);
  const dirty = recipeKey(draft) !== recipeKey(saved);
  const eyeSizeLabel = useId();
  const eyeSpacingLabel = useId();

  useEffect(() => {
    if (!equippedWear) return;
    markUnlockSeen(equippedWear);
  }, [equippedWear]);

  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, dirty]);

  const finishClose = () => {
    setConfirmDiscard(false);
    onOpenChange(false);
    if (fromQuery) router.replace("/settings");
  };

  const requestClose = () => {
    if (ignoreDiscard.current || !dirty) {
      ignoreDiscard.current = false;
      finishClose();
      return;
    }
    setConfirmDiscard(true);
  };

  const discardAndClose = () => {
    setDraft(saved);
    finishClose();
  };

  const set = (patch: Partial<AvatarConfig>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const setPalette = (palette: AvatarConfig["palette"]) =>
    setDraft((current) => {
      const next = { ...current, palette };
      return current.accessories.body ? equipAccessory(next, "body", null) : next;
    });
  const setEyes = (patch: Partial<AvatarConfig["eyes"]>) =>
    setDraft((current) => ({
      ...current,
      eyes: { ...current.eyes, ...patch },
    }));

  const shuffle = () => {
    setDraft((current) => ({
      ...randomAvatar(),
      accessories: current.accessories,
      reaction: current.reaction,
    }));
  };

  const reset = () => setDraft(defaultAvatar(userId));

  const toggleItem = (id: AccessoryId) => {
    setDraft((current) => {
      const slot = ACCESSORIES[id].slot;
      const equipped = current.accessories[slot] === id;
      return equipAccessory(current, slot, equipped ? null : id);
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveMyAvatar(draft);
      if (!result.ok) {
        toast.error(result.error);
        mascotBus.emit("save.error");
        return;
      }
      setSaved(result.avatar);
      setDraft(result.avatar);
      setConfirmDiscard(false);
      ignoreDiscard.current = true;
      onOpenChange(false);
      queueMicrotask(() => {
        ignoreDiscard.current = false;
      });
      toast.success("Buddy saved.");
      router.replace("/settings");
      router.refresh();
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else requestClose();
        }}
      >
        <DialogContent
          className="top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 lg:top-1/2 lg:left-1/2 lg:h-auto lg:max-h-[min(90dvh,860px)] lg:w-[calc(100%-2rem)] lg:max-w-4xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl"
        >
          <DialogHeader className="shrink-0 pr-12">
            <DialogTitle>Your buddy</DialogTitle>
            <DialogDescription>
              {"A small character that's yours. It shows up around Dossier."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-0 lg:self-start">
            <div className="pt-6">
              <div className="relative size-40">
                <MascotStatic
                  avatar={draft}
                  size={PREVIEW_PX}
                  spill={SPILL_LIVE}
                  alt=""
                  className={cn(
                    "pointer-events-none absolute top-0 left-0 transition-opacity duration-300 motion-reduce:transition-none",
                    liveReady ? "opacity-0" : "opacity-100",
                  )}
                />
                <LiveMascot
                  avatar={draft}
                  size={PREVIEW_PX}
                  seed={userId}
                  userId="me"
                  interactive={false}
                  follow="region"
                  listen={false}
                  glow
                  lateNight={false}
                  sleepAfterMs={0}
                  onReady={() => setLiveReady(true)}
                  aria-label="Your buddy preview"
                  className={cn(
                    "transition-opacity duration-300 motion-reduce:transition-none",
                    liveReady ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>
            </div>
            <div className="flex w-full max-w-56 flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={shuffle}
                disabled={isPending}
              >
                Shuffle
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={reset}
                disabled={isPending}
              >
                Reset to my default
              </Button>
            </div>
          </div>

          <Tabs defaultValue="look" className="min-w-0 gap-5">
            <TabsList className="grid w-full grid-cols-2 lg:inline-flex lg:w-fit">
              <TabsTrigger value="look">Look</TabsTrigger>
              <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
            </TabsList>

            <TabsContent value="look" className="flex flex-col gap-6">
              <OptionGroup label="Shape">
                {ACTIVE_SHAPES.map((id) => (
                  <OptionTile
                    key={id}
                    label={SHAPES[id].label}
                    pressed={draft.shape === id}
                    onClick={() => set({ shape: id })}
                    avatar={{ ...draft, shape: id }}
                  />
                ))}
              </OptionGroup>

              <OptionGroup label="Colour">
                {PALETTE_IDS.map((id) => {
                  const palette = PALETTES[id];
                  const pressed = draft.palette === id;
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={palette.label}
                          aria-pressed={pressed}
                          onClick={() => setPalette(id)}
                          className={cn(
                            "size-9 rounded-full ring-offset-2 ring-offset-card transition-transform duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            pressed
                              ? "scale-110 ring-2 ring-primary"
                              : "ring-2 ring-transparent hover:scale-105",
                          )}
                          style={{ background: palette.mid }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{palette.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </OptionGroup>

              <OptionGroup label="Eyes">
                {ACTIVE_EYE_STYLES.map((id) => (
                  <OptionTile
                    key={id}
                    label={EYE_STYLES[id].label}
                    pressed={draft.eyes.style === id}
                    onClick={() => setEyes({ style: id })}
                    avatar={{
                      ...draft,
                      eyes: { ...draft.eyes, style: id },
                    }}
                  />
                ))}
                <div className="grid w-full basis-full gap-4 pt-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-2.5">
                    <Label id={eyeSizeLabel}>Eye size</Label>
                    <Slider
                      aria-labelledby={eyeSizeLabel}
                      min={EYE_SIZE_RANGE[0]}
                      max={EYE_SIZE_RANGE[1]}
                      step={0.01}
                      value={[draft.eyes.size]}
                      onValueChange={([next]) => {
                        if (next === undefined) return;
                        setEyes({ size: round2(next) });
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Label id={eyeSpacingLabel}>Eye spacing</Label>
                    <Slider
                      aria-labelledby={eyeSpacingLabel}
                      min={EYE_SPACING_RANGE[0]}
                      max={EYE_SPACING_RANGE[1]}
                      step={0.01}
                      value={[draft.eyes.spacing]}
                      onValueChange={([next]) => {
                        if (next === undefined) return;
                        setEyes({ spacing: round2(next) });
                      }}
                    />
                  </div>
                </div>
              </OptionGroup>

              <OptionGroup label="Cheeks">
                {ACTIVE_CHEEKS.map((id) => (
                  <OptionTile
                    key={id}
                    label={CHEEK_LABEL[id]}
                    pressed={draft.cheeks === id}
                    onClick={() => set({ cheeks: id })}
                    avatar={{ ...draft, cheeks: id }}
                  />
                ))}
              </OptionGroup>

            </TabsContent>

            <TabsContent value="wardrobe" className="flex flex-col gap-6">
              {draft.accessories.body && (
                <p className="text-sm text-muted-foreground">
                  Skins replace your accessories.
                </p>
              )}
              {SLOT_ORDER.map((slot) => {
                const items = OFFERED_ACCESSORIES.filter(
                  (id) => ACCESSORIES[id].slot === slot,
                ).sort(byWardrobeOrder);
                if (!items.length) return null;
                return (
                  <section key={slot} className="flex flex-col gap-2">
                    <h3 className="label-eyebrow">{SLOT_LABEL[slot]}</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((id) => (
                        <WardrobeTile
                          key={id}
                          id={id}
                          draft={draft}
                          owned={owned}
                          stats={stats}
                          now={now}
                          timeZone={timeZone}
                          isNew={owned.has(id) && !isStarter(id) && !seen.has(id)}
                          onSeen={() => markUnlockSeen(id)}
                          onToggle={() => toggleItem(id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
          </div>
          <div className="shrink-0 border-t bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={save}
                disabled={!dirty || isPending}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your buddy edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="label-eyebrow">{label}</h3>
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </section>
  );
}

function OptionTile({
  label,
  pressed,
  onClick,
  avatar,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  avatar: AvatarConfig;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex w-[4.75rem] flex-col items-center gap-1 rounded-xl px-1.5 pt-5 pb-2 ring-1 transition-[background-color,box-shadow,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]",
        pressed
          ? "bg-primary/10 text-foreground ring-primary"
          : "text-muted-foreground ring-foreground/10 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <BuddyStill avatar={avatar} px={40} />
      <span className="text-[11px] leading-tight font-medium">{label}</span>
    </button>
  );
}

function BuddyStill({ avatar, px }: { avatar: AvatarConfig; px: number }) {
  return (
    <span className="relative block shrink-0" style={{ width: px, height: px }}>
      <MascotStatic avatar={avatar} size={px} fitParent alt="" />
    </span>
  );
}

function WardrobeTile({
  id,
  draft,
  owned,
  stats,
  now,
  timeZone,
  isNew,
  onSeen,
  onToggle,
}: {
  id: AccessoryId;
  draft: AvatarConfig;
  owned: ReadonlySet<string>;
  stats: RewardStats;
  now: Date;
  timeZone: string;
  isNew: boolean;
  onSeen: () => void;
  onToggle: () => void;
}) {
  const def = ACCESSORIES[id];
  const wearable = isWearable(id, owned, now, timeZone);
  const on = draft.accessories[def.slot] === id;
  const locked = !wearable && !on;
  const rarity = RARITY_STYLE[def.rarity];
  const season = seasonWindowLabel(id);
  const prog = !wearable ? unlockProgressLabel(id, stats) : null;
  const preview = itemPreview(draft, id);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={locked}
      onClick={() => {
        if (owned.has(id)) onSeen();
        if (locked) return;
        onToggle();
      }}
      className={cn(
        "relative flex h-full flex-col items-center gap-1.5 rounded-xl px-2.5 pt-6 pb-3 text-center ring-1 transition-[background-color,box-shadow,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        on
          ? "bg-primary/10 ring-primary"
          : "ring-foreground/10 hover:bg-foreground/5",
        locked && "cursor-not-allowed hover:bg-transparent",
        !locked && "active:scale-[0.98]",
      )}
    >
      {isNew && (
        <span
          aria-hidden
          className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-card"
        />
      )}
      {locked && (
        <Lock
          aria-hidden
          className="absolute top-3 right-3 size-3.5 text-muted-foreground"
        />
      )}
      <span className={cn("block transition-opacity", locked && "opacity-40 grayscale")}>
        <BuddyStill avatar={preview} px={48} />
      </span>
      <span className="text-xs leading-tight font-medium">
        {isNew && <span className="sr-only">New. </span>}
        {def.label}
      </span>
      <span className="flex flex-wrap items-center justify-center gap-1">
        <Badge
          variant="outline"
          className="border-current/25"
          style={{ color: rarity.color }}
        >
          {rarity.label}
        </Badge>
        {season && <Badge variant="secondary">{season}</Badge>}
      </span>
      {!wearable && (
        <p className="text-[11px] leading-snug text-muted-foreground">{def.hint}</p>
      )}
      {prog && (
        <div className="mt-auto flex w-full flex-col gap-1 pt-1">
          <Progress value={prog.value} aria-label={prog.label} />
          <span className="text-[10px] text-muted-foreground">{prog.label}</span>
        </div>
      )}
    </button>
  );
}
