"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { REPORT_FIELDS } from "@/lib/reports/fields";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { DeadlineContext } from "@/lib/reports/submission-status";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

// Controlled by the parent (Team Reports page): index is a position into
// the *currently filtered/sorted* list of submitted reports, so
// Previous/Next cycles through exactly what the manager is looking at,
// not a separate unfiltered fetch.
export function ReportDetailSheet({
  members,
  index,
  onIndexChange,
  deadline,
  adminView = false,
  showProfileLink = true,
}: {
  members: SubmittedMember[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  deadline: DeadlineContext;
  adminView?: boolean;
  showProfileLink?: boolean;
}) {
  const current = index !== null ? members[index] : null;

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(next) => !next && onIndexChange(null)}
    >
      <DialogContent className="sm:max-w-lg">
        {index !== null && current && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <MemberAvatar
                  name={current.fullName}
                  avatarUrl={current.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle asChild>
                      <span className="text-lg font-semibold">
                        {current.fullName}
                      </span>
                    </DialogTitle>
                    <SubmissionStatusBadge
                      status={getSubmissionStatus(
                        current.report.submitted_at,
                        deadline.deadlineHourUtc,
                        deadline,
                      )}
                    />
                  </div>
                  <DialogDescription asChild>
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <LocalDateTime isoString={current.report.submitted_at} />
                      {showProfileLink && (
                        <EmployeeNameLink
                          employeeId={current.employeeId}
                          fullName="View Profile →"
                          basePath={
                            adminView
                              ? "/admin/employees"
                              : "/manager/employees"
                          }
                          className="text-xs text-primary hover:underline shrink-0"
                        />
                      )}
                    </div>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
              {REPORT_FIELDS.map((field) => {
                const value = current.report[field.key];

                return (
                  <div key={field.key}>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-muted-foreground">
                      {value ?? "None reported"}
                    </p>
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {index + 1} of {members.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === members.length - 1}
                  onClick={() => onIndexChange(index + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
