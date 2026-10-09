"use client";

import { useState, type ReactNode } from "react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { HeroViewHeader } from "@/components/dashboard/hero-view-header";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { useOrgNow } from "@/components/mascot/use-org-now";
import { Tile, TileBody, TileFooterAction, TileHeader } from "@/components/ui/tile";
import { deadlineWindow } from "@/lib/helpers/deadline-window";
import { formatLocalTime } from "@/lib/helpers/time";
import {
  getSubmissionStatus,
  SUBMISSION_STATUS_LABELS,
  type DeadlineContext,
} from "@/lib/reports/submission-status";
import { cn } from "@/lib/utils";
import type { DailyReport } from "@/types/report";
import type { UserRole } from "@/types/profile";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";

const eyebrow =
  "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const LEAVE_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

type Submitted = TeamMemberReport & { report: DailyReport };

function bucket(member: TeamMemberReport, orgOffDay: boolean): "missing" | "submitted" | "away" {
  const status = member.attendanceStatus;
  if (status === "leave" || status === "holiday" || status === "weekly_off") return "away";
  if (orgOffDay && !member.report) return "away";
  if (member.report) return "submitted";
  return "missing";
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function statusLabel(member: Submitted, deadline: DeadlineContext): string {
  return SUBMISSION_STATUS_LABELS[
    getSubmissionStatus(member.report.submitted_at, deadline.deadlineHourUtc, deadline)
  ];
}

function deadlineCopy(minutesLeft: number, pastDue: boolean): string {
  if (pastDue) return "Deadline passed";
  if (minutesLeft < 60) return `${minutesLeft} min to deadline`;
  const hours = Math.floor(minutesLeft / 60);
  const rest = minutesLeft % 60;
  if (rest === 0) return `${hours}h to deadline`;
  return `${hours}h ${rest}m to deadline`;
}

function awayCopy(member: TeamMemberReport): string {
  if (member.attendanceStatus === "leave") {
    if (!member.leaveUntil) return "On leave";
    return `On leave until ${LEAVE_DATE.format(new Date(`${member.leaveUntil}T00:00:00Z`))}`;
  }
  return "Off today";
}

function splitTeam(members: TeamMemberReport[], orgOffDay: boolean) {
  const missing = members
    .filter((member) => bucket(member, orgOffDay) === "missing")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const submitted = members
    .filter((member): member is Submitted => bucket(member, orgOffDay) === "submitted" && member.report != null)
    .sort((a, b) => (a.report.submitted_at < b.report.submitted_at ? 1 : -1));
  const away = members
    .filter((member) => bucket(member, orgOffDay) === "away")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  return { missing, submitted, away, expected: missing.length + submitted.length };
}

export function HeroTeamTile({
  label,
  members,
  orgOffDay,
  templates,
  deadline,
  shiftFulltimeStart,
  viewerRole,
  currentUserId,
  onView,
  triggerRef,
}: {
  label: "Team today" | "Company today";
  members: TeamMemberReport[];
  orgOffDay: boolean;
  templates: ReportTemplateWithFields[];
  deadline: DeadlineContext;
  shiftFulltimeStart: string;
  viewerRole: UserRole;
  currentUserId: string;
  onView: () => void;
  triggerRef: (node: HTMLButtonElement | null) => void;
}) {
  const now = useOrgNow();
  const progress = deadlineWindow(now, deadline.timezone, shiftFulltimeStart, deadline.deadlineHourLocal);
  const [index, setIndex] = useState<number | null>(null);
  const { missing, submitted, away, expected } = splitTeam(members, orgOffDay);
  const shownMissing = missing.slice(0, 4);
  const more = missing.length - shownMissing.length;
  const latest = submitted.slice(0, 3);
  const everyoneIn = members.length > 0 && missing.length === 0 && expected > 0;
  const summaryBits = [
    missing.length > 0 ? `${missing.length} missing` : null,
    away.length > 0 ? `${away.length} away` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <>
      <Tile className="h-full" style={{ viewTransitionName: "hero-team" }}>
        <TileHeader
          eyebrow={label}
          aside={
            !orgOffDay ? (
              <span className={progress.amber ? "text-amber-700 dark:text-amber-400" : undefined}>
                {deadlineCopy(progress.minutesLeft, progress.pastDue)}
              </span>
            ) : undefined
          }
        />
        <TileBody className="mt-3 min-h-0">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 md:gap-0">
            <div className="flex flex-col items-center justify-center gap-1 text-center md:pr-4">
              <CompletionRing
                done={submitted.length}
                total={expected}
                full={everyoneIn}
                size={104}
              />
              <p className="mt-2 text-[15px] font-medium tabular-nums">
                {submitted.length} of {expected} in
              </p>
              {summaryBits.length > 0 && (
                <p className="text-xs text-muted-foreground">{summaryBits.join(" · ")}</p>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center md:border-l md:border-edge md:pl-5">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members assigned yet</p>
              ) : everyoneIn ? (
                <div>
                  <p className="text-sm font-medium">Latest reports</p>
                  {latest.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No reports yet today</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {latest.map((member, itemIndex) => (
                        <li key={member.report.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg py-1 text-left outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setIndex(itemIndex)}
                          >
                            <MemberAvatar
                              name={member.fullName}
                              userId={member.employeeId}
                              avatar={member.avatar}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-sm font-medium">{firstName(member.fullName)}</p>
                                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {formatLocalTime(member.report.submitted_at)}
                                </p>
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {statusLabel(member, deadline)}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : missing.length > 0 ? (
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      progress.pastDue && "text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {progress.pastDue ? "Missing" : "Not in yet"}
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {shownMissing.map((member) => {
                      const detail =
                        member.attendanceStatus === "half_leave"
                          ? [member.designation, "half day"].filter(Boolean).join(" · ")
                          : member.designation;
                      return (
                        <li key={member.employeeId} className="flex items-center gap-2">
                          <MemberAvatar
                            name={member.fullName}
                            userId={member.employeeId}
                            avatar={member.avatar}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{member.fullName}</p>
                            {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {more > 0 && (
                    <button
                      type="button"
                      className="mt-2 text-sm text-muted-foreground max-md:min-h-11"
                      onClick={onView}
                    >
                      +{more} more
                    </button>
                  )}
                </div>
              ) : null}
              <div className="flex-1" />
            </div>
          </div>
        </TileBody>
        <TileFooterAction ref={triggerRef} onClick={onView}>
          View progress
        </TileFooterAction>
      </Tile>
      <ReportDetailSheet
        members={submitted}
        index={index}
        onIndexChange={setIndex}
        deadline={deadline}
        templates={templates}
        viewerRole={viewerRole}
        currentUserId={currentUserId}
        showProfileLink
        adminView={viewerRole === "admin" || viewerRole === "owner"}
      />
    </>
  );
}

export function HeroTeamView({
  label,
  members,
  commentCounts,
  orgOffDay,
  templates,
  deadline,
  shiftFulltimeStart,
  viewerRole,
  currentUserId,
  onClose,
  panelRef,
}: {
  label: "Team today" | "Company today";
  members: TeamMemberReport[];
  commentCounts: Record<string, number>;
  orgOffDay: boolean;
  templates: ReportTemplateWithFields[];
  deadline: DeadlineContext;
  shiftFulltimeStart: string;
  viewerRole: UserRole;
  currentUserId: string;
  onClose: (options?: { restoreFocus?: boolean }) => void;
  panelRef: (node: HTMLDivElement | null) => void;
}) {
  const now = useOrgNow();
  const progress = deadlineWindow(now, deadline.timezone, shiftFulltimeStart, deadline.deadlineHourLocal);
  const [index, setIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { missing, submitted, away, expected } = splitTeam(members, orgOffDay);
  const shown = expanded ? submitted : submitted.slice(0, 5);
  const more = submitted.length - shown.length;
  const deadlineText = orgOffDay ? null : deadlineCopy(progress.minutesLeft, progress.pastDue);

  return (
    <Tile style={{ viewTransitionName: "hero-team" }}>
      <HeroViewHeader
        title={label}
        panelRef={panelRef}
        onClose={onClose}
        leading={
          <CompletionRing
            done={submitted.length}
            total={expected}
            full={expected > 0 && missing.length === 0}
            size={28}
          />
        }
        meta={
          <>
            {submitted.length} of {expected} in
            {deadlineText ? (
              <>
                {" · "}
                <span className={progress.amber ? "text-amber-700 dark:text-amber-400" : undefined}>
                  {deadlineText}
                </span>
              </>
            ) : null}
          </>
        }
      />
      {members.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No team members assigned yet</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 divide-y divide-edge md:grid-cols-3 md:divide-x md:divide-y-0">
          <Column title="Not in yet" count={missing.length}>
            {missing.map((member) => (
              <Person
                key={member.employeeId}
                member={member}
                detail={
                  member.attendanceStatus === "half_leave"
                    ? [member.designation, "half day"].filter(Boolean).join(" · ")
                    : member.designation
                }
              />
            ))}
          </Column>
          <Column title="Submitted" count={submitted.length}>
            {shown.map((member) => {
              const comments = commentCounts[member.report.id] ?? 0;
              const late =
                getSubmissionStatus(member.report.submitted_at, deadline.deadlineHourLocal, deadline) === "late";
              const sheetIndex = submitted.findIndex((item) => item.report.id === member.report.id);
              return (
                <div key={member.report.id} className="flex items-center gap-2 py-1.5">
                  <MemberAvatar name={member.fullName} userId={member.employeeId} avatar={member.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocalTime(member.report.submitted_at)}
                      {comments > 0 ? ` · ${comments} ${comments === 1 ? "comment" : "comments"}` : ""}
                      {late ? " · late" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline max-md:min-h-11"
                    onClick={() => setIndex(sheetIndex)}
                  >
                    Read
                  </button>
                </div>
              );
            })}
            {more > 0 && (
              <button
                type="button"
                className="mt-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline max-md:min-h-11"
                onClick={() => setExpanded(true)}
              >
                +{more} more
              </button>
            )}
          </Column>
          <Column title="Away today" count={away.length}>
            {away.map((member) => (
              <Person key={member.employeeId} member={member} detail={awayCopy(member)} dimmed />
            ))}
          </Column>
        </div>
      )}
      <ReportDetailSheet
        members={submitted}
        index={index}
        onIndexChange={setIndex}
        deadline={deadline}
        templates={templates}
        viewerRole={viewerRole}
        currentUserId={currentUserId}
        showProfileLink
        adminView={viewerRole === "admin" || viewerRole === "owner"}
      />
    </Tile>
  );
}

function Column({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="py-3 md:px-4 md:py-0 md:first:pl-0 md:last:pr-0">
      <p className={eyebrow}>
        {title} · {count}
      </p>
      <div className="mt-2">
        {count === 0 ? <p className="text-sm text-muted-foreground">No one</p> : children}
      </div>
    </div>
  );
}

function Person({
  member,
  detail,
  dimmed = false,
}: {
  member: TeamMemberReport;
  detail: string | null;
  dimmed?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 py-1.5", dimmed && "opacity-60")}>
      <MemberAvatar name={member.fullName} userId={member.employeeId} avatar={member.avatar} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{member.fullName}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function CompletionRing({
  done,
  total,
  full,
  size = 64,
}: {
  done: number;
  total: number;
  full: boolean;
  size?: number;
}) {
  const stroke = size < 40 ? 3 : size >= 80 ? 7 : 5;
  const pct = total === 0 ? 0 : Math.round((Math.min(done, total) / total) * 100);
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ratio = full || total === 0 ? (full ? 1 : 0) : Math.min(1, done / total);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-foreground/15" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * ratio} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="stroke-emerald-600 dark:stroke-emerald-400"
        />
      </svg>
      {size >= 40 && (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-medium tabular-nums",
            size >= 80 ? "text-xl font-semibold" : "text-[11px]",
          )}
        >
          {size >= 80 ? `${full ? 100 : pct}%` : `${done}/${total}`}
        </span>
      )}
    </div>
  );
}
