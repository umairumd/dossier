import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";

export function SubmitReportCard({
  alreadySubmitted,
}: {
  alreadySubmitted: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Daily Report</CardTitle>
        <CardDescription>
          Log today&apos;s progress for your manager to review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SubmitReportSheet alreadySubmitted={alreadySubmitted} />
      </CardContent>
    </Card>
  );
}
