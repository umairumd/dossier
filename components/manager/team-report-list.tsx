"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/helpers/dates";
import type { TeamMemberReport } from "@/types/team";

// Missing reports sort first (most actionable for a manager), then
// submitted reports by submission time — the "sort by submission time"
// behavior this feature asked for, applied within the submitted group.
function sortMembers(members: TeamMemberReport[]) {
  return [...members].sort((a, b) => {
    if (!a.report && b.report) return -1;
    if (a.report && !b.report) return 1;
    if (a.report && b.report) {
      return (
        new Date(b.report.submitted_at).getTime() -
        new Date(a.report.submitted_at).getTime()
      );
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

function ReportDetails({ report }: { report: TeamMemberReport["report"] }) {
  if (!report) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3 text-sm">
      <div>
        <p className="font-medium">Accomplishments</p>
        <p className="text-muted-foreground">{report.content}</p>
      </div>
      <div>
        <p className="font-medium">Blockers</p>
        <p className="text-muted-foreground">
          {report.blockers ?? "None reported"}
        </p>
      </div>
      <div>
        <p className="font-medium">Tomorrow&apos;s Plan</p>
        <p className="text-muted-foreground">
          {report.additional_notes ?? "None reported"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ report }: { report: TeamMemberReport["report"] }) {
  return report ? (
    <Badge>Submitted</Badge>
  ) : (
    <Badge variant="secondary">Missing</Badge>
  );
}

export function TeamReportList({ members }: { members: TeamMemberReport[] }) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? members.filter((member) =>
          member.fullName.toLowerCase().includes(normalizedQuery),
        )
      : members;

    return sortMembers(matches);
  }, [members, query]);

  const toggleExpanded = (employeeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const emptyMessage =
    members.length === 0
      ? "No employees are assigned to your department yet."
      : "No employees match your search.";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employees..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const isExpanded = expandedIds.has(member.employeeId);

                  return (
                    <Fragment key={member.employeeId}>
                      <TableRow
                        className={cn(member.report && "cursor-pointer")}
                        onClick={() =>
                          member.report && toggleExpanded(member.employeeId)
                        }
                      >
                        <TableCell className="font-medium">
                          {member.fullName}
                        </TableCell>
                        <TableCell>
                          <StatusBadge report={member.report} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.report
                            ? formatDateTime(member.report.submitted_at)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {member.report && (
                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180",
                              )}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && member.report && (
                        <TableRow>
                          <TableCell colSpan={4} className="p-0">
                            <ReportDetails report={member.report} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((member) => {
              const isExpanded = expandedIds.has(member.employeeId);

              return (
                <div
                  key={member.employeeId}
                  className="rounded-lg border border-border"
                >
                  <button
                    type="button"
                    disabled={!member.report}
                    onClick={() => toggleExpanded(member.employeeId)}
                    className="flex w-full flex-col gap-2 p-3 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {member.fullName}
                      </span>
                      <StatusBadge report={member.report} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {member.report
                          ? `Submitted ${formatDateTime(member.report.submitted_at)}`
                          : "No report today"}
                      </span>
                      {member.report && (
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      )}
                    </div>
                  </button>
                  {isExpanded && <ReportDetails report={member.report} />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
