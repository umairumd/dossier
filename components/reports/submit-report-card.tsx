import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import type { ReportTemplateWithFields } from "@/types/template";

export function SubmitReportCard({
  alreadySubmitted,
  isAdmin = false,
  template,
}: {
  alreadySubmitted: boolean;
  isAdmin?: boolean;
  template?: ReportTemplateWithFields;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Daily Report</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Log today's progress."
            : "Log today's progress for your manager to review."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SubmitReportSheet
          alreadySubmitted={alreadySubmitted}
          template={template}
        />
      </CardContent>
    </Card>
  );
}
