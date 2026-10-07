"use client";

import { useState, type ReactNode } from "react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { HeroViewHeader } from "@/components/dashboard/hero-view-header";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { useOrgNow } from "@/components/mascot/use-org-now";
import { Button } from "@/components/ui/button";
import { deadlineWindow } from "@/lib/helpers/deadline-window";
import { formatLocalTime } from "@/lib/helpers/time";
import { getSubmissionStatus, type DeadlineContext } from "@/lib/reports/submission-status";
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

function excerpt(member: Submitted, templates: ReportTemplateWithFields[]): string {
  const report = member.report;
  const responses = report.field_responses;
  const template = templates.find((item) => item.id === report.template_id);
  if (responses && template) {
    const fields = [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder);
    for (const field of fields) {
      if (field.fieldType !== "text" && field.fieldType !== "textarea") continue;
      const raw = responses[field.id] ?? responses[field.key];
      if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/\s+/g, " ");
    }
  }
  return report.content?.trim().replace(/\s+/g, " ") ?? "";
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
  const { missing, submitted, expected } = splitTeam(members, orgOffDay);
  const latest = submitted[0];
  const faces = missing.slice(0, 3);
  const named = faces.map((member) => firstName(member.fullName)).join(", ");
  const extra = missing.length - faces.length;
  const everyoneIn = members.length > 0 && missing.length === 0 && expected > 0;

  return (
    <section
      className="flex h-full flex-col rounded-xl bg-foreground/[0.03] p-[18px] ring-1 ring-foreground/10"
      style={{ viewTransitionName: "hero-team" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={eyebrow}>{label}</h2>
        {!orgOffDay && (
          <p className={cn("text-xs", progress.amber ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
            {deadlineCopy(progress.minutesLeft, progress.pastDue)}
          </p>
        )}
      </div>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No team members assigned yet</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <CompletionRing done={submitted.length} total={expected} full={everyoneIn} />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {everyoneIn ? "Everyone's in" : `${missing.length} not in yet`}
              </p>
              {!everyoneIn && faces.length > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <FaceStack members={faces} />
                  <p className="truncate text-xs text-muted-foreground">
                    {named}
                    {extra > 0 ? ` +${extra}` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            {latest ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg py-1 text-left outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11"
                onClick={() => setIndex(0)}
              >
                <span className="shrink-0 text-xs text-muted-foreground">Latest</span>
                <MemberAvatar name={latest.fullName} userId={latest.employeeId} avatar={latest.avatar} size="sm" />
                <span className="min-w-0 truncate text-sm">
                  <span className="font-medium">{firstName(latest.fullName)}</span>
                  <span className="text-muted-foreground"> · {excerpt(latest, templates) || "Submitted"}</span>
                </span>
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">No reports yet today</p>
            )}
          </div>
        </>
      )}
      <div className="mt-auto pt-3">
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="max-md:min-h-11"
          onClick={onView}
        >
          View progress
        </Button>
      </div>
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
    </section>
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
    <section
      className="rounded-xl bg-foreground/[0.03] p-[18px] ring-1 ring-foreground/10"
      style={{ viewTransitionName: "hero-team" }}
    >
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
        <div className="mt-4 grid grid-cols-1 divide-y divide-foreground/10 md:grid-cols-3 md:divide-x md:divide-y-0">
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
                  <MemberAvatar name={member.fullName} userId={member.employeeId} avatar={member.avatar} size="sm" />
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
    </section>
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
      <MemberAvatar name={member.fullName} userId={member.employeeId} avatar={member.avatar} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{member.fullName}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function FaceStack({ members }: { members: TeamMemberReport[] }) {
  return (
    <div className="flex items-center">
      {members.map((member, index) => (
        <span key={member.employeeId} className={cn("relative", index > 0 && "-ml-2")} style={{ zIndex: members.length - index }}>
          <MemberAvatar name={member.fullName} userId={member.employeeId} avatar={member.avatar} size="sm" />
        </span>
      ))}
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
  const stroke = size < 40 ? 3 : 5;
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
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium">
          {done}/{total}
        </span>
      )}
    </div>
  );
}
