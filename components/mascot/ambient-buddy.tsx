"use client";

/**
 * Idle buddies for Team Today and Birthdays.
 * At most LAUNCH.maxLiveAvatars visible canvases; everyone else is a still.
 * Off-screen canvases pause in the engine, and a fully hidden one gives its slot back.
 * No cursor follow and no poke. Personality comes from the person's id.
 */
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
import dynamic from "next/dynamic";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { MascotStatic } from "@/components/mascot/mascot";
import {
  AVATAR_SIZE_CLASS,
  AVATAR_SIZE_PX,
} from "@/components/mascot/member-avatar";
import {
  LAUNCH,
  SPILL_LIVE,
  SPILL_STATIC,
  sanitizeAvatar,
  type AvatarConfig,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";

const LiveMascot = dynamic(
  () => import("@/components/mascot/mascot").then((mod) => mod.Mascot),
  { ssr: false },
);

type Claim = { order: number; visible: boolean };

const AmbientBudgetContext = createContext<{
  granted: ReadonlySet<string>;
  request: (id: string, order: number, visible: boolean) => void;
  release: (id: string) => void;
} | null>(null);

function sameIds(current: ReadonlySet<string>, next: string[]) {
  return current.size === next.length && next.every((id) => current.has(id));
}

export function AmbientBudget({
  children,
  max = LAUNCH.maxLiveAvatars,
}: {
  children: ReactNode;
  max?: number;
}) {
  const claims = useRef(new Map<string, Claim>());
  const [granted, setGranted] = useState<ReadonlySet<string>>(() => new Set());

  const publish = useCallback(() => {
    const next = [...claims.current.entries()]
      .filter(([, claim]) => claim.visible)
      .sort((a, b) => a[1].order - b[1].order || (a[0] < b[0] ? -1 : 1))
      .slice(0, max)
      .map(([id]) => id);
    setGranted((current) => (sameIds(current, next) ? current : new Set(next)));
  }, [max]);

  const request = useCallback(
    (id: string, order: number, visible: boolean) => {
      const prev = claims.current.get(id);
      if (prev && prev.order === order && prev.visible === visible) return;
      claims.current.set(id, { order, visible });
      publish();
    },
    [publish],
  );

  const release = useCallback(
    (id: string) => {
      if (!claims.current.delete(id)) return;
      publish();
    },
    [publish],
  );

  const value = useMemo(
    () => ({ granted, request, release }),
    [granted, request, release],
  );

  return (
    <AmbientBudgetContext.Provider value={value}>
      {children}
    </AmbientBudgetContext.Provider>
  );
}

/** Month-day of `dateOfBirth` matches the org-timezone `orgToday` (YYYY-MM-DD). */
export function isOrgBirthday(
  dateOfBirth: string | null | undefined,
  orgToday: string,
) {
  return !!dateOfBirth && dateOfBirth.slice(5, 10) === orgToday.slice(5, 10);
}

function withPartyHat(avatar: unknown, userId: string, birthday: boolean): AvatarConfig {
  const cfg = sanitizeAvatar(avatar, userId);
  if (!birthday) return cfg;
  return {
    ...cfg,
    accessories: { ...cfg.accessories, head: "partyHat" },
  };
}

export function AmbientBuddy({
  userId,
  name,
  avatar,
  order,
  birthday = false,
  size = "md",
}: {
  userId: string;
  name: string;
  avatar?: unknown;
  /** Document order. The first 12 visible buddies in this order get a canvas. */
  order: number;
  birthday?: boolean;
  size?: keyof typeof AVATAR_SIZE_PX;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const budget = useContext(AmbientBudgetContext);
  const request = budget?.request;
  const release = budget?.release;
  const shown = useMemo(
    () => withPartyHat(avatar, userId, birthday),
    [avatar, userId, birthday],
  );
  const px = AVATAR_SIZE_PX[size];
  const live = budget?.granted.has(userId) ?? false;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !request || !release) return;
    const io = new IntersectionObserver((entries) => {
      request(
        userId,
        order,
        entries.some((entry) => entry.isIntersecting),
      );
    });
    io.observe(host);
    return () => {
      io.disconnect();
      release(userId);
    };
  }, [request, release, userId, order]);

  // The canvas subscribes in its own effect. Emit on the next turn so it hears this.
  useEffect(() => {
    if (!live || !birthday) return;
    const timer = window.setTimeout(() => {
      mascotBus.emit("birthday.teammate", { userId });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [live, birthday, userId]);

  return (
    <span
      ref={hostRef}
      className={cn(
        "relative inline-block shrink-0",
        AVATAR_SIZE_CLASS[size],
      )}
    >
      {live ? (
        <LiveMascot
          avatar={shown}
          size={px}
          seed={userId}
          userId={userId}
          listen
          follow="none"
          spill={SPILL_LIVE}
          className="absolute inset-0"
          aria-label={name}
        />
      ) : (
        <MascotStatic
          avatar={shown}
          size={px}
          spill={birthday ? SPILL_LIVE : SPILL_STATIC}
          fitParent
          alt={name}
        />
      )}
    </span>
  );
}
