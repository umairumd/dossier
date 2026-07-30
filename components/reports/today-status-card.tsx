import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyReport } from "@/types/report";

export function TodayStatusCard({ report }: { report: DailyReport | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Status</CardTitle>
        <CardDescription>Whether you&apos;ve reported in today.</CardDescription>
      </CardHeader>
      <CardContent>
        {report ? (
          <Badge>Submitted</Badge>
        ) : (
          <Badge variant="secondary">Not submitted</Badge>
        )}
      </CardContent>
    </Card>
  );
}
