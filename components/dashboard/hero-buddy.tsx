"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MascotStatic } from "@/components/mascot/mascot";
import { mascotBus } from "@/components/mascot/mascot-bus";
import {
  registerHeroController,
  subscribeHeroSheet,
  takeSkipHeroResting,
} from "@/components/dashboard/hero-controller";
import {
  LAUNCH,
  SPILL_LIVE,
  sanitizeAvatar,
  type AvatarConfig,
  type MascotController,
  type MomentId,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";

const LiveMascot = dynamic(
  () => import("@/components/mascot/mascot").then((mod) => mod.Mascot),
  { ssr: false },
);

const HERO_PX = 96;
const WAVE_KEY = "dossier-buddy-waved";
const INTRO_KEY = "dossier-buddy-introduced";
const NOTIF_DELAY_MS = 2500;

export type HeroNotification = {
  type: string;
  created_at: string;
};

function restingMoment(
  hasReport: boolean,
  isOffDay: boolean,
  onFullDayLeave: boolean,
): MomentId {
  if (hasReport) return "report.done";
  if (isOffDay || onFullDayLeave) return "day.off";
  return "report.due";
}

function notificationMoment(type: string): MomentId {
  if (type === "leave_approved") return "leave.approved";
  if (type === "leave_rejected") return "leave.rejected";
  if (type === "report_commented") return "comment.received";
  return "notification.new";
}

function pickNotification(unread: HeroNotification[], userId: string) {
  let watermark = "";
  try {
    watermark = localStorage.getItem(`dossier-buddy-notif-at:${userId}`) ?? "";
  } catch {
    return null;
  }
  const fresh = unread
    .filter((note) => note.created_at > watermark)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const chosen =
    fresh.find(
      (note) => note.type === "leave_approved" || note.type === "leave_rejected",
    ) ??
    fresh.find((note) => note.type === "report_commented") ??
    fresh[0];
  if (!chosen) return null;
  return { moment: notificationMoment(chosen.type), createdAt: chosen.created_at };
}

function fitFollowToCard(host: HTMLElement) {
  const card = host.closest("[data-hero-card]");
  if (!card) return;
  const avatar = host.getBoundingClientRect();
  const bounds = card.getBoundingClientRect();
  const ax = avatar.left + avatar.width / 2;
  const ay = avatar.top + avatar.height / 2;
  const radius = Math.max(
    Math.hypot(bounds.left - ax, bounds.top - ay),
    Math.hypot(bounds.right - ax, bounds.top - ay),
    Math.hypot(bounds.right - ax, bounds.bottom - ay),
    Math.hypot(bounds.left - ax, bounds.bottom - ay),
  );
  return Math.ceil(radius);
}

export function HeroBuddy({
  userId,
  avatar,
  hasReport,
  isOffDay,
  onFullDayLeave,
  isBirthday,
  orgDate,
  currentStreak = 0,
  teamComplete = false,
  unread,
}: {
  userId: string;
  avatar: unknown;
  hasReport: boolean;
  isOffDay: boolean;
  onFullDayLeave: boolean;
  isBirthday: boolean;
  orgDate: string;
  currentStreak?: number;
  teamComplete?: boolean;
  unread: HeroNotification[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<MascotController | null>(null);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const shown = useMemo(() => {
    const cfg = sanitizeAvatar(avatar, userId);
    if (!isBirthday) return cfg;
    return {
      ...cfg,
      accessories: { ...cfg.accessories, head: "partyHat" as const },
    } satisfies AvatarConfig;
  }, [avatar, userId, isBirthday]);
  const resting = restingMoment(hasReport, isOffDay, onFullDayLeave);

  useEffect(() => subscribeHeroSheet(setSheetOpen), []);

  useEffect(() => {
    return () => registerHeroController(null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    const card = host?.closest("[data-hero-card]");
    if (!host || !card) return;
    const fit = () => {
      const radius = fitFollowToCard(host);
      if (radius) ctlRef.current?.setFollow("region", radius);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    if (!sheetOpen && takeSkipHeroResting()) return;
    mascotBus.emit(sheetOpen ? "report.writing" : resting, { userId });
  }, [ready, sheetOpen, resting, userId]);

  useEffect(() => {
    if (!ready) return;
    let playedLogin = false;
    try {
      playedLogin = sessionStorage.getItem(WAVE_KEY) === "1";
      if (!playedLogin) sessionStorage.setItem(WAVE_KEY, "1");
    } catch {
      playedLogin = true;
    }
    if (!playedLogin) mascotBus.emit("auth.login", { userId });

    try {
      if (isBirthday) {
        const year = orgDate.slice(0, 4);
        const key = `dossier-buddy-bday-${year}:${userId}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          mascotBus.emit("birthday.self", { userId });
        }
      }
      if (teamComplete) {
        const key = `dossier-buddy-team-complete:${userId}:${orgDate}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          mascotBus.emit("team.complete", { userId });
        }
      }
      if (currentStreak === 5 || currentStreak === 10 || currentStreak === 30) {
        const key = `dossier-buddy-streak-seen:${userId}`;
        const seen = Number(localStorage.getItem(key) ?? "0");
        if (currentStreak > seen) {
          localStorage.setItem(key, String(currentStreak));
          mascotBus.emit("streak.milestone", { userId });
        }
      }
    } catch {
      // Private mode: skip the once-per-day moments.
    }

    const chosen = pickNotification(unread, userId);
    if (!chosen) return;
    const delay = playedLogin ? 0 : NOTIF_DELAY_MS;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(`dossier-buddy-notif-at:${userId}`, chosen.createdAt);
      } catch {
        // Still play it; the next load may repeat if storage is blocked.
      }
      mascotBus.emit(chosen.moment, { userId });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [ready, userId, isBirthday, orgDate, teamComplete, currentStreak, unread]);

  return (
    <div ref={hostRef} className="relative size-24 shrink-0">
      <MascotStatic
        avatar={shown}
        size={HERO_PX}
        spill={SPILL_LIVE}
        alt=""
        className={cn(
          "pointer-events-none absolute top-0 left-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready ? "opacity-0" : "opacity-100",
        )}
      />
      <LiveMascot
        avatar={shown}
        size={HERO_PX}
        seed={userId}
        userId={userId}
        interactive
        follow="region"
        listen
        sleepAfterMs={LAUNCH.sleepAfterMs}
        onReady={(ctl) => {
          ctlRef.current = ctl;
          registerHeroController(ctl);
          const host = hostRef.current;
          const radius = host ? fitFollowToCard(host) : undefined;
          if (radius) ctl.setFollow("region", radius);
          setReady(true);
        }}
        aria-label="Your buddy"
      />
    </div>
  );
}

function subscribeIntro() {
  return () => {};
}

function introHiddenOnServer() {
  return true;
}

function introAlreadySeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function HeroIntro() {
  const seen = useSyncExternalStore(
    subscribeIntro,
    introAlreadySeen,
    introHiddenOnServer,
  );
  const [dismissed, setDismissed] = useState(false);
  if (seen || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-foreground/5 px-3 py-2 text-sm">
      <p className="min-w-0 flex-1">Meet your buddy. Make it yours.</p>
      <Link
        href="/settings#your-buddy"
        className="shrink-0 font-medium text-primary hover:underline"
      >
        Customise
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 rounded-md px-1.5 text-base leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          try {
            localStorage.setItem(INTRO_KEY, "1");
          } catch {
            // Hiding it for this view is enough when storage is blocked.
          }
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
