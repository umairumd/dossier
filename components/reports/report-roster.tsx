"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  DataList,
  DataListChevron,
  DataListRow,
  DataListSection,
  PersonCell,
} from "@/components/shared/data-list";
import type { SegmentedOption } from "@/components/shared/segmented-filter";
import { LocalTime } from "@/components/shared/local-time";
import {
  ManagerIndicator,
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import {
  getSubmissionStatus,
  type DeadlineContext,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";
import type { DailyReport, ReportComment } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

// Who has submitted on a date, as one list (Team Reports, Track Reports).
// Departments or groups are section rows inside the same list; the whole row
// opens the reader, the name opens the profile.

export type RosterFilter = "all" | "submitted" | "pending" | "missed" | "on_leave" | "off";

export function rosterStatus(
  member: TeamMemberReport,
  deadline: DeadlineContext,
  reportDate?: string,
  isOffDay?: boolean,
): SubmissionStatus {
  return getSubmissionStatus(
    member.report?.submitted_at ?? null,
    deadline.deadlineHourUtc,
    deadline,
    reportDate,
    member.isOnLeave,
    isOffDay,
  );
}

export function matchesRosterFilter(status: SubmissionStatus, filter: RosterFilter): boolean {
  if (filter === "all") return true;
  if (filter === "submitted") return status === "on_time" || status === "late";
  return status === filter;
}

/** All, Submitted and Pending always; Missed, On leave and Off only when present. */
export function rosterFilterOptions(statuses: SubmissionStatus[]): SegmentedOption<RosterFilter>[] {
  const count = (filter: RosterFilter) =>
    statuses.filter((status) => matchesRosterFilter(status, filter)).length;
  const options: SegmentedOption<RosterFilter>[] = [
    { value: "all", label: "All", count: statuses.length },
    { value: "submitted", label: "Submitted", count: count("submitted") },
    { value: "pending", label: "Pending", count: count("pending") },
  ];
  for (const [value, label] of [
    ["missed", "Missed"],
    ["on_leave", "On leave"],
    ["off", "Off"],
  ] as const) {
    const n = count(value);
    if (n > 0) options.push({ value, label, count: n });
  }
  return options;
}

export interface RosterSection {
  key: string;
  title?: ReactNode;
  aside?: ReactNode;
  members: TeamMemberReport[];
  managerId?: string;
  emptyMessage?: string;
}

type Submitted = TeamMemberReport & { report: DailyReport };

const COLUMNS = "minmax(0,1fr) 7.5rem 7rem 1.25rem";

export function ReportRoster({
  sections,
  deadline,
  reportDate,
  isOffDay,
  templates,
  adminView = false,
  viewerRole,
  currentUserId,
  comments,
}: {
  /** Comments for the listed reports, loaded with the roster. */
  comments?: Record<string, ReportComment[]>;
  sections: RosterSection[];
  deadline: DeadlineContext;
  reportDate?: string;
  isOffDay?: boolean;
  templates?: ReportTemplateWithFields[];
  adminView?: boolean;
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Everyone with a report, once, in list order: previous/next in the reader
  // follows the list.
  const submitted = useMemo(() => {
    const seen = new Set<string>();
    const out: Submitted[] = [];
    for (const section of sections) {
      for (const member of section.members) {
        if (member.report && !seen.has(member.employeeId)) {
          seen.add(member.employeeId);
          out.push(member as Submitted);
        }
      }
    }
    return out;
  }, [sections]);

  const open = (employeeId: string) => {
    const index = submitted.findIndex((member) => member.employeeId === employeeId);
    if (index !== -1) setOpenIndex(index);
  };

  return (
    <>
      <DataList columns={COLUMNS} header={["Person", "Status", "Submitted", ""]}>
        {sections.map((section) => (
          <Fragment key={section.key}>
            {section.title != null && (
              <DataListSection title={section.title} aside={section.aside} />
            )}
            {section.members.length === 0 && (
              <li className="px-(--row-x) py-4 text-sm text-muted-foreground">
                {section.emptyMessage ?? "No one matches."}
              </li>
            )}
            {section.members.map((member) => {
              const status = rosterStatus(member, deadline, reportDate, isOffDay);
              const time = member.report ? (
                <LocalTime isoString={member.report.submitted_at} />
              ) : null;
              return (
                <DataListRow
                  key={`${section.key}-${member.employeeId}`}
                  onClick={member.report ? () => open(member.employeeId) : undefined}
                  label={member.report ? `Read ${member.fullName}'s report` : undefined}
                >
                  <PersonCell
                    id={member.employeeId}
                    name={member.fullName}
                    avatar={member.avatar}
                    href={`/employees/${member.employeeId}`}
                    addon={
                      <>
                        {section.managerId === member.employeeId && <ManagerIndicator />}
                        {member.isRemote && <RemoteIndicator />}
                        {member.employment_type === "part_time" && <PartTimeIndicator />}
                      </>
                    }
                    detail={
                      <>
                        {member.designation ?? ""}
                        {time && (
                          <span className="md:hidden">
                            {member.designation ? " · " : ""}
                            {time}
                          </span>
                        )}
                      </>
                    }
                  />
                  <span>
                    <SubmissionStatusBadge status={status} />
                  </span>
                  <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
                    {time ?? "—"}
                  </span>
                  <DataListChevron show={Boolean(member.report)} />
                </DataListRow>
              );
            })}
          </Fragment>
        ))}
      </DataList>

      <ReportDetailSheet
        members={submitted}
        index={openIndex}
        onIndexChange={setOpenIndex}
        deadline={deadline}
        adminView={adminView}
        templates={templates}
        viewerRole={viewerRole}
        currentUserId={currentUserId}
        initialComments={comments}
      />
    </>
  );
}
