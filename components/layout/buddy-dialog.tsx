"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CustomiseBuddyDialog } from "@/components/settings/customise-buddy-dialog";
import { useSignedInBuddyIdentity } from "@/components/layout/signed-in-buddy";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { getBuddyDialogData, type BuddyDialogData } from "@/lib/actions/avatar";
import { ACCESSORIES, type AccessoryId } from "@/lib/mascot";

type OpenOptions = { wear?: AccessoryId };

type BuddyDialogApi = {
  open: (options?: OpenOptions) => void;
  /** Start the wardrobe fetch before the dialog opens. Cached for the session. */
  prefetch: () => void;
};

const BuddyDialogContext = createContext<BuddyDialogApi | null>(null);

export function useBuddyDialog() {
  const value = useContext(BuddyDialogContext);
  if (!value) {
    throw new Error("useBuddyDialog must be used inside BuddyDialogProvider");
  }
  return value;
}

function isAccessoryId(id: string): id is AccessoryId {
  return Object.prototype.hasOwnProperty.call(ACCESSORIES, id);
}

/** Opens the customise dialog from a toast href such as /settings?buddy=open&wear=beanie. */
export function openBuddyFromHref(
  open: (options?: OpenOptions) => void,
  href: string,
) {
  const wear = new URL(href, window.location.origin).searchParams.get("wear");
  open(wear && isAccessoryId(wear) ? { wear } : {});
}

export function BuddyDialogProvider({ children }: { children: ReactNode }) {
  const identity = useSignedInBuddyIdentity();
  const [open, setOpen] = useState(false);
  const [wear, setWear] = useState<AccessoryId | undefined>();
  const [session, setSession] = useState(0);
  const [wardrobe, setWardrobe] = useState<BuddyDialogData | null>(null);
  const [error, setError] = useState(false);
  const [queried, setQueried] = useState(false);
  const cacheRef = useRef<BuddyDialogData | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);

  if (typeof window !== "undefined" && !queried) {
    const url = new URL(window.location.href);
    const buddy = url.searchParams.get("buddy");
    const wearParam = url.searchParams.get("wear");
    setQueried(true);
    if (buddy === "open" || wearParam) {
      setWear(wearParam && isAccessoryId(wearParam) ? wearParam : undefined);
      setOpen(true);
    }
  }

  const invalidate = useCallback(() => {
    generationRef.current += 1;
    cacheRef.current = null;
    inflightRef.current = null;
    setWardrobe(null);
    setError(false);
  }, []);

  const load = useCallback(() => {
    if (cacheRef.current || inflightRef.current) return;
    const generation = generationRef.current;
    inflightRef.current = getBuddyDialogData().then((next) => {
      if (generation !== generationRef.current) return;
      inflightRef.current = null;
      if (!next) {
        setError(true);
        return;
      }
      cacheRef.current = next;
      setError(false);
      setWardrobe(next);
    });
  }, []);

  const prefetch = useCallback(() => {
    load();
  }, [load]);

  const openDialog = useCallback((options?: OpenOptions) => {
    setWear(options?.wear);
    setSession((current) => current + 1);
    setOpen(true);
    load();
  }, [load]);

  const api = useMemo(() => ({ open: openDialog, prefetch }), [openDialog, prefetch]);

  useEffect(() => {
    if (!queried) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("buddy") && !url.searchParams.has("wear")) return;
    url.searchParams.delete("buddy");
    url.searchParams.delete("wear");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [queried]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => mascotBus.on((event) => {
    if (event.moment !== "reward.unlocked") return;
    invalidate();
    load();
  }), [invalidate, load]);

  const wardrobeProps = wardrobe
    ? {
        ownedIds: wardrobe.ownedIds,
        stats: wardrobe.stats,
        timeZone: wardrobe.timeZone,
        nowIso: wardrobe.nowIso,
      }
    : null;

  return (
    <BuddyDialogContext.Provider value={api}>
      {children}
      {open && identity ? (
        <CustomiseBuddyDialog
          key={session}
          open
          onOpenChange={setOpen}
          userId={identity.userId}
          avatar={identity.avatar}
          wardrobe={wardrobeProps}
          wardrobeError={error}
          wear={wear}
          onSaved={invalidate}
        />
      ) : null}
    </BuddyDialogContext.Provider>
  );
}
