"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import { LocalDateTime } from "@/components/shared/local-datetime";
import type { DailyReport } from "@/types/report";

export function TodayReportCard({
  todayReport,
  deadlineHint,
}: {
  todayReport: DailyReport | null;
  deadlineHint?: string;
}) {
  const router = useRouter();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Today&apos;s Report</CardTitle>
      </CardHeader>
      <CardContent>
        {todayReport ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Badge>Submitted</Badge>
              <p className="text-sm text-muted-foreground">
                <LocalDateTime isoString={todayReport.submitted_at} />
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">View report →</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                No report submitted yet
              </p>
              {deadlineHint && (
                <p className="text-xs text-muted-foreground">{deadlineHint}</p>
              )}
            </div>
            <SubmitReportSheet
              alreadySubmitted={false}
              triggerLabel="Submit Report"
              onSubmitted={() => router.refresh()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
