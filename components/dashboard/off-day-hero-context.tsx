import { DayOffTag } from "@/components/shared/day-off-tag";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

export function OffDayHeroContext({
  todayReport,
  template,
}: {
  todayReport: DailyReport | null;
  template?: ReportTemplateWithFields;
}) {
  return (
    <>
      <DayOffTag />
      {!todayReport && (
        <SubmitReportSheet
          alreadySubmitted={false}
          triggerLabel="Submit anyway"
          triggerVariant="link"
          triggerSize="sm"
          triggerClassName="h-auto px-0 text-xs text-muted-foreground"
          template={template}
        />
      )}
    </>
  );
}
