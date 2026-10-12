"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  HeroBuddy,
  type HeroNotification,
} from "@/components/dashboard/hero-buddy";
import { HeroForYou, type ForYouItem } from "@/components/dashboard/hero-for-you";
import { HeroProgressTile } from "@/components/dashboard/hero-progress-tile";
import { HeroReportPanel } from "@/components/reports/today-report";
import { HeroDeck } from "@/components/dashboard/hero-deck";
import { HeroTeamTile, HeroTeamView } from "@/components/dashboard/hero-team-tile";
import { TYPE_ICONS } from "@/components/layout/notification-bell";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { useHeroPanel } from "@/components/dashboard/use-hero-panel";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import type { UnlockRow } from "@/lib/actions/avatar";
import type { RewardStats } from "@/lib/mascot";
import { clearNotification } from "@/lib/actions/notifications";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import {
  notificationActionLabel,
  resolveNotificationUrl,
} from "@/lib/notifications/link";
import type { Notification } from "@/types/notification";
import type { UserRole } from "@/types/profile";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";
import type { TeamMemberReport } from "@/types/team";
import { HomeHeroSkeleton } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

export interface HeroTeam {
  label: "Team today" | "Company today";
  members: TeamMemberReport[];
  commentCounts: Record<string, number>;
  teamPageHref: string;
  orgOffDay: boolean;
  templates: ReportTemplateWithFields[];
  deadline: DeadlineContext;
  viewerRole: UserRole;
  currentUserId: string;
}

export interface HeroStat {
  label: string;
  value: string;
}

interface DashboardHeroProps {
  userId: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  contextLine: ReactNode;
  stats?: HeroStat[];
  avatar: unknown;
  hasReport: boolean;
  isOffDay: boolean;
  onFullDayLeave: boolean;
  isBirthday: boolean;
  isReporting: boolean;
  orgDate: string;
  timeZone: string;
  deadlineHourLocal: number;
  shiftFulltimeStart: string;
  currentStreak?: number;
  /** Share of working days with a report, last 30 days (progress tile). */
  submissionRate?: number;
  teamComplete?: boolean;
  unread: HeroNotification[];
  notifications: Notification[];
  actorAvatars?: Record<string, unknown>;
  rewardStats: RewardStats;
  unlocks: UnlockRow[];
  asOf: string;
  initialPanel: HeroPanelId | null;
  todayReport: DailyReport | null;
  template?: ReportTemplateWithFields;
  team?: HeroTeam | null;
}

export function DashboardHero({
  userId,
  name,
  designation,
  departmentNames,
  contextLine,
  stats,
  avatar,
  hasReport,
  isOffDay,
  onFullDayLeave,
  isBirthday,
  isReporting,
  orgDate,
  timeZone,
  deadlineHourLocal,
  shiftFulltimeStart,
  currentStreak = 0,
  submissionRate = 0,
  teamComplete,
  unread,
  notifications,
  actorAvatars = {},
  rewardStats,
  unlocks,
  asOf,
  initialPanel,
  todayReport,
  template,
  team = null,
}: DashboardHeroProps) {
  const showReport = isReporting;
  const allowReport = showReport && !(onFullDayLeave && !todayReport);
  const allowTeam = team != null;
  const areaRef = useRef<HTMLDivElement>(null);
  const { open, openPanel, close, panelRef, setTrigger } = useHeroPanel({
    initial: initialPanel,
    allowReport,
    allowTeam,
  });

  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    areaRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [open]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  function forgetNotification(id: string) {
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    startTransition(() => clearNotification(id));
  }

  // One row per notice: repeats of the same notice (same type, subject and
  // title) collapse into the newest, and dismissing it clears them all.
  const groups = new Map<string, { note: Notification; ids: string[] }>();
  for (const note of notifications) {
    if (note.cleared_at != null || dismissed.includes(note.id)) continue;
    const key = `${note.type}|${note.entity_id ?? ""}|${note.title}`;
    const group = groups.get(key);
    if (group) group.ids.push(note.id);
    else groups.set(key, { note, ids: [note.id] });
  }
  const forYou: ForYouItem[] = [...groups.values()].map(({ note, ids }) =>
    notificationForYouItem(note, () => ids.forEach(forgetNotification), actorAvatars),
  );
  const meta = [designation, departmentNames?.join(", ")].filter(Boolean).join(" · ");
  const statColumns = !stats || stats.length <= 2 ? 2 : stats.length === 3 ? 3 : 4;
  // The buddies are drawn on a canvas, which only exists in the browser; the
  // server can only send placeholder discs. Keep the loading shape on top
  // until the hero has hydrated and drawn them, then reveal it whole.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <div className="grid">
      {!hydrated && (
        <div className="[grid-area:1/1]">
          <HomeHeroSkeleton stats={stats?.length ?? 0} team={team != null} reporting={isReporting} />
        </div>
      )}
      <div
        data-hero-card
        aria-hidden={!hydrated || undefined}
        className={cn(
          "surface-card flex scroll-mt-16 flex-col gap-6 overflow-visible rounded-xl px-3 pt-6 pb-3 [grid-area:1/1] md:p-6",
          hydrated ? "rise-in" : "invisible",
        )}
      >
        {/* On a phone the tiles sit 12px from the hero's sides and bottom, the
            same as the gap between them; the greeting and figures keep their
            24px inset. Desktop keeps 24px all round. */}
        <div className="flex flex-col gap-6 px-3 md:flex-row md:px-0 md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <HeroBuddy
              userId={userId}
              avatar={avatar}
              hasReport={hasReport || Boolean(todayReport)}
              isOffDay={isOffDay}
              onFullDayLeave={onFullDayLeave}
              isBirthday={isBirthday}
              isReporting={isReporting}
              orgDate={orgDate}
              timeZone={timeZone}
              deadlineHourLocal={deadlineHourLocal}
              currentStreak={currentStreak}
              teamComplete={teamComplete}
              unread={unread}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <DashboardGreeting name={name} />
              {meta && (
                <p className="truncate text-sm text-muted-foreground">{meta}</p>
              )}
              {typeof contextLine === "string" ? (
                <p className="mt-1 text-sm text-foreground/70">{contextLine}</p>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {contextLine}
                </div>
              )}
            </div>
          </div>

          {stats && stats.length > 0 && (
            <div
              className="grid w-full shrink-0 gap-x-6 gap-y-4 md:w-auto"
              style={{ gridTemplateColumns: `repeat(${statColumns}, minmax(0, 1fr))` }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="field-label">{stat.label}</span>
                  <span className="text-xl font-semibold tracking-tight">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={areaRef} className="scroll-mt-16">
          <HeroDeck
            panel={open}
            tiles={
              <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                {showReport && (
                  <div className="md:col-span-2">
                    <HeroReportPanel
                      open={false}
                      onOpen={() => openPanel("report")}
                      onClose={close}
                      triggerRef={setTrigger("report")}
                      panelRef={panelRef}
                      userId={userId}
                      todayReport={todayReport}
                      template={template}
                      isOffDay={isOffDay}
                      onFullDayLeave={onFullDayLeave}
                      orgDate={orgDate}
                      timeZone={timeZone}
                      deadlineHourLocal={deadlineHourLocal}
                      shiftFulltimeStart={shiftFulltimeStart}
                    />
                  </div>
                )}
                {/* Progress is about your own reports: hidden for people
                    excluded from reporting, and the team tile takes the row. */}
                {isReporting && (
                  <div className={cn("order-2 h-full md:order-1", !team && "md:col-span-2")}>
                    <HeroProgressTile
                      userId={userId}
                      avatar={avatar}
                      stats={rewardStats}
                      unlocks={unlocks}
                      asOf={asOf}
                      currentStreak={currentStreak}
                      submissionRate={submissionRate}
                      wide={!team}
                    />
                  </div>
                )}
                {team && (
                  <div className={cn("order-1 h-full md:order-2", !isReporting && "md:col-span-2")}>
                    <HeroTeamTile
                      label={team.label}
                      members={team.members}
                      orgOffDay={team.orgOffDay}
                      templates={team.templates}
                      deadline={team.deadline}
                      shiftFulltimeStart={shiftFulltimeStart}
                      viewerRole={team.viewerRole}
                      currentUserId={team.currentUserId}
                      onView={() => openPanel("team")}
                      triggerRef={setTrigger("team")}
                      commentCounts={team.commentCounts}
                      wide={!isReporting}
                    />
                  </div>
                )}
              </div>
            }
            renderView={(id) =>
              id === "team" && team ? (
                <HeroTeamView
                  label={team.label}
                  members={team.members}
                  commentCounts={team.commentCounts}
                  orgOffDay={team.orgOffDay}
                  templates={team.templates}
                  deadline={team.deadline}
                  shiftFulltimeStart={shiftFulltimeStart}
                  viewerRole={team.viewerRole}
                  currentUserId={team.currentUserId}
                  onClose={close}
                  panelRef={panelRef}
                />
              ) : (
                <HeroReportPanel
                  open
                  onOpen={() => openPanel("report")}
                  onClose={close}
                  triggerRef={setTrigger("report")}
                  panelRef={panelRef}
                  userId={userId}
                  todayReport={todayReport}
                  template={template}
                  isOffDay={isOffDay}
                  onFullDayLeave={onFullDayLeave}
                  orgDate={orgDate}
                  timeZone={timeZone}
                  deadlineHourLocal={deadlineHourLocal}
                  shiftFulltimeStart={shiftFulltimeStart}
                />
              )
            }
          />
        </div>

        <HeroForYou items={forYou} />
      </div>
    </div>
  );
}

function notificationForYouItem(
  note: Notification,
  forget: () => void,
  actorAvatars: Record<string, unknown>,
): ForYouItem {
  const icon = TYPE_ICONS[note.type];
  const Icon = icon?.Icon ?? Bell;
  const actorId = note.entity_type === "employee" ? note.entity_id : null;
  const href = resolveNotificationUrl(note.type, note.entity_type, note.entity_id);
  return {
    id: note.id,
    source: "notification",
    icon: actorId ? (
      <MemberAvatar
        name={note.title}
        userId={actorId}
        avatar={actorAvatars[actorId]}
        size="xs"
      />
    ) : (
      <Icon className={`size-4 ${icon?.className ?? "text-muted-foreground"}`} />
    ),
    title: note.title,
    body: note.body ?? undefined,
    time: formatDistanceToNow(new Date(note.created_at), { addSuffix: true }),
    actions: href
      ? [{ label: notificationActionLabel(note.type), href, onClick: forget }]
      : [],
    onDismiss: forget,
  };
}
