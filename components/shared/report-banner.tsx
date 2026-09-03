"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import {
  DEFAULT_REPORT_DEADLINE_HOUR_UTC,
  getSubmissionStatus,
} from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";

export function ReportBanner({
  todayReport,
  deadlineHint,
  deadlineHourUtc = DEFAULT_REPORT_DEADLINE_HOUR_UTC,
  onSubmitted,
}: {
  todayReport: DailyReport | null;
  deadlineHint?: string;
  deadlineHourUtc?: number;
  onSubmitted?: () => void;
}) {
  const router = useRouter();

  function handleSubmitted() {
    router.refresh();
    onSubmitted?.();
  }

  if (todayReport) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border card-gradient-strong px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-medium whitespace-nowrap">
              Report submitted
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>
                · <LocalDateTime isoString={todayReport.submitted_at} />
              </span>
              <SubmissionStatusBadge
                status={getSubmissionStatus(
                  todayReport.submitted_at,
                  deadlineHourUtc,
                )}
              />
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
          <Link
            href="/reports/history"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-t border-r border-b border-border border-l-2 border-l-primary shadow-sm card-gradient px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <FileText className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-medium whitespace-nowrap">
            Submit today&apos;s report
          </span>
          {deadlineHint && (
            <span className="text-xs text-muted-foreground">
              · {deadlineHint}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
        <SubmitReportSheet
          alreadySubmitted={false}
          triggerLabel="Submit →"
          onSubmitted={handleSubmitted}
        />
        <Link
          href="/reports/history"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View history
        </Link>
      </div>
    </div>
  );
}
