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
      <div className="flex items-center gap-3 rounded-lg border border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
        <CheckCircle2 className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">Report submitted</span>
          <span className="ml-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
        <Link
          href="/reports/history"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          View history
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border-l-2 border-l-primary bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 shadow-sm">
      <FileText className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">Submit today&apos;s report</span>
        {deadlineHint && (
          <span className="ml-2 text-xs text-muted-foreground">
            · {deadlineHint}
          </span>
        )}
      </div>
      <Link
        href="/reports/history"
        className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        View history
      </Link>
      <SubmitReportSheet
        alreadySubmitted={false}
        triggerLabel="Submit →"
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
