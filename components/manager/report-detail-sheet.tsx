"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserCircle,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { DynamicFieldRenderer } from "@/components/reports/dynamic-field-renderer";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { ReportTemplateWithFields } from "@/types/template";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

function formatModalSubmittedAt(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortTemplateName(name: string): string {
  return name.endsWith(" Template") ? name.slice(0, -" Template".length) : name;
}

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
  templates,
}: {
  members: SubmittedMember[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  deadline: DeadlineContext;
  adminView?: boolean;
  showProfileLink?: boolean;
  templates?: ReportTemplateWithFields[];
}) {
  const current = index !== null ? members[index] : null;
  const templateForReport = current?.report.template_id
    ? templates?.find((template) => template.id === current.report.template_id)
    : null;
  const profileBasePath = adminView ? "/employees" : "/manager/employees";

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(next) => !next && onIndexChange(null)}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {index !== null && current && (
          <>
            <DialogHeader className="shrink-0 space-y-2 border-b p-4">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  userId={current.employeeId}
                  name={current.fullName}
                  avatarUrl={current.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <DialogTitle asChild>
                    <span className="font-semibold">{current.fullName}</span>
                  </DialogTitle>
                  <SubmissionStatusBadge
                    status={getSubmissionStatus(
                      current.report.submitted_at,
                      deadline.deadlineHourUtc,
                      deadline,
                      undefined,
                      current.isOnLeave,
                    )}
                  />
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Close"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </DialogClose>
              </div>

              <DialogDescription asChild>
                <div className="flex flex-wrap items-center text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3 shrink-0" aria-hidden />
                    {formatModalSubmittedAt(current.report.submitted_at)}
                  </span>
                  {templateForReport && (
                    <>
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3 shrink-0" aria-hidden />
                        Template: {shortTemplateName(templateForReport.name)}
                      </span>
                    </>
                  )}
                  {showProfileLink && (
                    <>
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      <Link
                        href={`${profileBasePath}/${current.employeeId}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                      >
                        <UserCircle className="size-3 shrink-0" aria-hidden />
                        View Profile →
                      </Link>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {templateForReport && current.report.field_responses
                ? [...templateForReport.fields]
                    .sort((a, b) => a.fieldOrder - b.fieldOrder)
                    .map((field) => (
                      <div
                        key={field.key}
                        className="border-b border-border/40 pb-4 last:border-0 last:pb-0"
                      >
                        <DynamicFieldRenderer
                          field={field}
                          value={current.report.field_responses?.[field.key]}
                          mode="display"
                        />
                      </div>
                    ))
                : current.report.field_responses
                  ? Object.entries(current.report.field_responses)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="border-b border-border/40 pb-4 last:border-0 last:pb-0"
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-foreground">
                            {String(value) || "None reported"}
                          </p>
                        </div>
                      ))
                  : (
                    <p className="text-sm text-muted-foreground">
                      No report data available.
                    </p>
                  )}
            </DialogBody>

            <DialogFooter className="!flex-row flex-row items-center justify-between gap-2 sm:justify-between">
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
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
