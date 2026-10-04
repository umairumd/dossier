"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import { DayOffTag } from "@/components/shared/day-off-tag";
import { LocalDateTime } from "@/components/shared/local-datetime";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

/**
 * Adaptive report-action row for the dashboard hero — all three states
 * share the same bottom row + divider treatment.
 */
export function HeroReportStatus({
  todayReport,
  isOffDay,
  deadlineHint,
  template,
}: {
  todayReport: DailyReport | null;
  isOffDay: boolean;
  deadlineHint?: string;
  template?: ReportTemplateWithFields;
}) {
  const router = useRouter();

  function handleSubmitted() {
    router.refresh();
  }

  if (todayReport) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          <span className="font-medium">Report submitted</span>
          <span className="text-muted-foreground">
            · <LocalDateTime isoString={todayReport.submitted_at} />
          </span>
        </div>
        <SubmitReportSheet
          alreadySubmitted
          initialReport={todayReport}
          triggerLabel="Edit Report"
          triggerVariant="outline"
          triggerSize="sm"
          template={template}
          onSubmitted={handleSubmitted}
        />
      </div>
    );
  }

  if (isOffDay) {
    return (
      <div className="flex items-center gap-3 border-t border-border/60 pt-4">
        <DayOffTag />
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          Shouldn&apos;t you be offline right now?
        </p>
        <SubmitReportSheet
          alreadySubmitted={false}
          triggerLabel="Submit anyway"
          triggerVariant="link"
          triggerSize="sm"
          triggerClassName="h-auto shrink-0 px-0 text-xs text-muted-foreground"
          template={template}
          onSubmitted={handleSubmitted}
        />
      </div>
    );
  }

  // Working day, no submission
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            Submit today&apos;s report
          </p>
          {deadlineHint && (
            <p className="text-xs text-muted-foreground">{deadlineHint}</p>
          )}
        </div>
      </div>
      <SubmitReportSheet
        alreadySubmitted={false}
        triggerLabel="Submit →"
        triggerSize="sm"
        template={template}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
