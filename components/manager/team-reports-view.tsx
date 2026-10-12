"use client";

import type { ReportComment } from "@/types/report";

import { useMemo, useState } from "react";
import {
  EmptyState,
  illustrationForTeamEmpty,
} from "@/components/shared/empty-state";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import {
  ReportRoster,
  matchesRosterFilter,
  rosterFilterOptions,
  rosterStatus,
  type RosterFilter,
} from "@/components/reports/report-roster";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import type { TeamMemberReport } from "@/types/team";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

export interface TeamReportsGroup {
  key: string;
  title: string;
  members: TeamMemberReport[];
  managerId?: string;
}

// Team Reports: search and a status filter over one list. When there is more
// than one group (your department and people who also report to you), each
// group is a section row in the same list.
export function TeamReportsView({
  groups,
  deadline,
  adminView = false,
  emptyMessage,
  templates,
  reportDate,
  viewerRole,
  currentUserId,
  comments,
  isOffDay,
}: {
  groups: TeamReportsGroup[];
  deadline: DeadlineContext;
  adminView?: boolean;
  emptyMessage?: string;
  templates?: ReportTemplateWithFields[];
  reportDate?: string;
  viewerRole?: UserRole;
  currentUserId?: string;
  /** Comments for the listed reports, loaded with the page. */
  comments?: Record<string, ReportComment[]>;
  isOffDay?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");

  const everyone = useMemo(() => groups.flatMap((group) => group.members), [groups]);
  const statusOf = (member: TeamMemberReport) =>
    rosterStatus(member, deadline, reportDate, isOffDay);

  const options = rosterFilterOptions(everyone.map(statusOf));

  const sections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return groups.map((group) => {
      let members = group.members;
      if (normalized) {
        members = members.filter((member) =>
          member.fullName.toLowerCase().includes(normalized),
        );
      }
      if (filter !== "all") {
        members = members.filter((member) =>
          matchesRosterFilter(
            rosterStatus(member, deadline, reportDate, isOffDay),
            filter,
          ),
        );
      }
      return {
        key: group.key,
        title: groups.length > 1 ? group.title : undefined,
        members: sortTeamMembersBySubmission(members),
        managerId: group.managerId,
        emptyMessage: "No one matches.",
      };
    });
  }, [groups, query, filter, deadline, reportDate, isOffDay]);

  if (everyone.length === 0) {
    const message = emptyMessage ?? "No one is reporting to you yet.";
    return <EmptyState title={message} illustration={illustrationForTeamEmpty(message)} />;
  }

  const nothingMatches = sections.every((section) => section.members.length === 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FilterSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search people…"
          />
        </div>
        <SegmentedFilter
          label="Report status"
          value={filter}
          onChange={setFilter}
          options={options}
        />
      </div>

      {nothingMatches ? (
        <EmptyState size="sm" title="No one matches your filters." />
      ) : (
        <ReportRoster
          sections={sections.filter(
            (section) => groups.length === 1 || section.members.length > 0,
          )}
          deadline={deadline}
          reportDate={reportDate}
          isOffDay={isOffDay}
          templates={templates}
          adminView={adminView}
          viewerRole={viewerRole}
          currentUserId={currentUserId}
          comments={comments}
        />
      )}
    </div>
  );
}
