"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SIGN_IN_WAVE_KEY } from "@/components/auth/sign-out-form";
import { MascotStatic } from "@/components/mascot/mascot";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { toastUnlocked } from "@/components/mascot/unlock-toast";
import { openBuddyFromHref, useBuddyDialog } from "@/components/layout/buddy-dialog";
import { useOrgNow } from "@/components/mascot/use-org-now";
import {
  registerHeroController,
  subscribeHeroPanel,
  takeSkipHeroResting,
  type HeroPanelId,
} from "@/components/dashboard/hero-controller";
import {
  LAUNCH,
  SPILL_LIVE,
  isLateNight,
  sanitizeAvatar,
  type AccessoryId,
  type AvatarConfig,
  type MascotController,
  type MomentId,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";

const LiveMascot = dynamic(
  () => import("@/components/mascot/mascot").then((mod) => mod.Mascot),
  { ssr: false },
);

const HERO_PX = 112;
const NOTIF_DELAY_MS = 2500;

function reportWindowMoment(
  now: Date,
  timeZone: string,
  deadlineHourLocal: number,
): MomentId {
  let tz = timeZone;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  const lastHour = (deadlineHourLocal + 23) % 24;
  if (hour === lastHour) return "report.due";
  if (hour >= deadlineHourLocal) return "report.overdue";
  return "report.calm";
}

export type HeroNotification = {
  type: string;
  created_at: string;
};

function restingMoment(
  hasReport: boolean,
  isOffDay: boolean,
  onFullDayLeave: boolean,
  isReporting: boolean,
  now: Date,
  timeZone: string,
  deadlineHourLocal: number,
): MomentId {
  if (hasReport) return "report.done";
  if (isOffDay || onFullDayLeave) return "day.off";
  if (!isReporting) return "report.calm";
  return reportWindowMoment(now, timeZone, deadlineHourLocal);
}

function panelMoment(panel: HeroPanelId | null, resting: MomentId): MomentId {
  if (panel === "report") return "report.writing";
  return resting;
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
  isReporting,
  orgDate,
  timeZone,
  deadlineHourLocal,
  currentStreak = 0,
  teamComplete = false,
  unread,
  freshUnlocks = [],
}: {
  userId: string;
  avatar: unknown;
  hasReport: boolean;
  isOffDay: boolean;
  onFullDayLeave: boolean;
  isBirthday: boolean;
  isReporting: boolean;
  orgDate: string;
  timeZone: string;
  /** First hour that counts as late, in org time. */
  deadlineHourLocal: number;
  currentStreak?: number;
  teamComplete?: boolean;
  unread: HeroNotification[];
  freshUnlocks?: AccessoryId[];
}) {
  const { open: openBuddy, prefetch } = useBuddyDialog();
  const now = useOrgNow();
  const hostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<MascotController | null>(null);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<HeroPanelId | null>(null);
  const shown = useMemo(() => {
    const cfg = sanitizeAvatar(avatar, userId);
    if (!isBirthday) return cfg;
    return {
      ...cfg,
      accessories: { ...cfg.accessories, head: "partyHat" as const },
    } satisfies AvatarConfig;
  }, [avatar, userId, isBirthday]);
  const resting = restingMoment(
    hasReport,
    isOffDay,
    onFullDayLeave,
    isReporting,
    now,
    timeZone,
    deadlineHourLocal,
  );

  useEffect(() => subscribeHeroPanel(setPanel), []);

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
    // Successful submit skips one snap so the eat moment can finish.
    // Any other close, including a minute later, re-applies the resting state now.
    if (!panel && takeSkipHeroResting()) return;
    mascotBus.emit(panelMoment(panel, resting), { userId });
  }, [ready, panel, resting, userId]);

  useEffect(() => {
    if (!ready) return;
    let playWave = false;
    try {
      const signedIn = sessionStorage.getItem(SIGN_IN_WAVE_KEY) !== "1";
      const dayKey = `dossier-buddy-day-wave:${userId}:${orgDate}`;
      const newDay = localStorage.getItem(dayKey) !== "1";
      playWave = signedIn || newDay;
      if (signedIn) sessionStorage.setItem(SIGN_IN_WAVE_KEY, "1");
      if (newDay) localStorage.setItem(dayKey, "1");
    } catch {
      playWave = false;
    }
    if (playWave) mascotBus.emit("auth.login", { userId });

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
    const delay = playWave ? NOTIF_DELAY_MS : 0;
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

  const unlockKey = freshUnlocks.join(",");
  useEffect(() => {
    if (!ready || !unlockKey) return;
    if (toastUnlocked(freshUnlocks, (href) => openBuddyFromHref(openBuddy, href)) && userId) {
      mascotBus.emit("reward.unlocked", { userId });
      prefetch();
    }
  }, [ready, unlockKey, freshUnlocks, openBuddy, prefetch, userId]);

  return (
    <div ref={hostRef} className="relative size-28 shrink-0">
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
        glow
        lateNight={isLateNight(now, timeZone)}
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
