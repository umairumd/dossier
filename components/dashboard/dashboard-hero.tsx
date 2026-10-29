"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import {
  HeroBuddy,
  type HeroNotification,
} from "@/components/dashboard/hero-buddy";
import { ForYouIcon, HeroForYou, type ForYouItem } from "@/components/dashboard/hero-for-you";
import { NoticeBand, noticeForYouItems, splitNotices } from "@/components/dashboard/hero-notices";
import { taskForYouItems } from "@/components/dashboard/hero-tasks";
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
import { sendBirthdayWish } from "@/lib/actions/birthdays";
import { clearNotification } from "@/lib/actions/notifications";
import {
  forYouDismissible,
  forYouGroup,
  forYouShowsTime,
} from "@/lib/notifications/for-you";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import {
  notificationActionLabel,
  resolveNotificationUrl,
} from "@/lib/notifications/link";
import type { AutoNotice, Notice } from "@/types/notice";
import type { TaskSummary } from "@/types/task";
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
  /** Posted notices for this person (announcements and personal notices). */
  notices?: Notice[];
  /** Automatic notices worked out on the server. */
  autoNotices?: AutoNotice[];
  /** Open tasks this person owns. */
  openTasks?: TaskSummary[];
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
  notices = [],
  autoNotices = [],
  openTasks = [],
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
  // Birthday wishes to you collapse into one row whoever sent them.
  const groups = new Map<string, { note: Notification; ids: string[]; notes: Notification[] }>();
  for (const note of notifications) {
    if (note.cleared_at != null || dismissed.includes(note.id)) continue;
    // The report reminder is done once today's report is in.
    if (note.type === "report_deadline" && hasReport) continue;
    // The notice itself shows in For you; its bell notification would repeat it.
    if (note.type === "notice_posted") continue;
    const key =
      note.type === "birthday_wish" ? "birthday_wish" : `${note.type}|${note.entity_id ?? ""}|${note.title}`;
    const group = groups.get(key);
    if (group) {
      group.ids.push(note.id);
      group.notes.push(note);
    } else groups.set(key, { note, ids: [note.id], notes: [note] });
  }
  const hide = (key: string) => setDismissed((prev) => (prev.includes(key) ? prev : [...prev, key]));
  const liveNotices = notices.filter((notice) => !dismissed.includes(`notice:${notice.id}`));
  const { band, rest: rowNotices } = splitNotices(liveNotices);
  const forYou: ForYouItem[] = [
    ...[...groups.values()].map(({ note, ids, notes }) =>
      notificationForYouItem(note, notes, () => ids.forEach(forgetNotification), actorAvatars, userId),
    ),
    ...noticeForYouItems(
      rowNotices,
      autoNotices.filter((auto) => !dismissed.includes(`auto:${auto.key}`)),
      hide,
    ),
    ...taskForYouItems(openTasks, orgDate),
  ];
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
        {band ? (
          <div className="md:-mt-1">
            <NoticeBand notice={band} onDone={() => hide(`notice:${band.id}`)} />
          </div>
        ) : null}
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

function wisherName(note: Notification): string {
  return note.title.replace(/ wished you a happy birthday$/, "");
}

function notificationForYouItem(
  note: Notification,
  all: Notification[],
  forget: () => void,
  actorAvatars: Record<string, unknown>,
  userId: string,
): ForYouItem {
  const group = forYouGroup(note.type);
  const dismissible = forYouDismissible(note.type);
  const time = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
  const base = {
    id: note.id,
    source: "notification",
    group,
    at: note.created_at,
    onDismiss: dismissible ? forget : undefined,
  };

  if (note.type === "birthday_wish") {
    const wishers = all.flatMap((item) =>
      item.entity_type === "employee" && item.entity_id ? [{ id: item.entity_id, item }] : [],
    );
    const names = all.map(wisherName);
    return {
      ...base,
      icon: (
        <span className="flex -space-x-1.5">
          {wishers.slice(0, 3).map(({ id, item }) => (
            <MemberAvatar
              key={id}
              name={wisherName(item)}
              userId={id}
              avatar={actorAvatars[id]}
              size="sm"
            />
          ))}
        </span>
      ),
      title:
        all.length === 1
          ? note.title
          : `${all.length} people wished you a happy birthday`,
      meta:
        all.length === 1
          ? undefined
          : names.length > 3
            ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
            : names.join(", "),
      actions: [],
    };
  }

  const icon = TYPE_ICONS[note.type];
  const Icon = icon?.Icon ?? Bell;
  const actorId = note.entity_type === "employee" ? note.entity_id : null;
  const href = resolveNotificationUrl(note.type, note.entity_type, note.entity_id);
  // Older birthday rows were sent with "Say hi" as their second line.
  const body = note.body && note.body !== "Say hi" ? note.body : null;
  const meta = [body, forYouShowsTime(note.type) ? time : null].filter(Boolean).join(" · ");

  let actions: ForYouItem["actions"] = [];
  if (note.type === "birthday") {
    if (actorId && actorId !== userId) {
      actions = [
        {
          label: "Send wishes",
          doneLabel: "Wished",
          done: Boolean(note.wished),
          onClick: async () => {
            const result = await sendBirthdayWish(actorId);
            if (!result.success) toast.error(result.error);
            return result.success;
          },
        },
      ];
    }
  } else if (href) {
    actions = [
      {
        label: notificationActionLabel(note.type),
        href,
        onClick: dismissible ? forget : undefined,
      },
    ];
  }

  return {
    ...base,
    icon: actorId ? (
      <MemberAvatar
        name={note.title}
        userId={actorId}
        avatar={actorAvatars[actorId]}
        size="md"
      />
    ) : (
      <ForYouIcon group={group}>
        <Icon className={group === "other" ? (icon?.className ?? "") : undefined} />
      </ForYouIcon>
    ),
    title: note.title,
    meta: meta || undefined,
    actions,
  };
}
