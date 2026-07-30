import { Building2, Inbox } from "lucide-react";
import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitReportCard } from "@/components/reports/submit-report-card";
import { TodayStatusCard } from "@/components/reports/today-status-card";

const TODAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function EmployeeDashboardPage() {
  const [profile, todayReport] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getTodayReport(),
  ]);
  const today = TODAY_FORMATTER.format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{profile ? `, ${profile.full_name}` : ""}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{today}</span>
          {profile && (
            <Badge variant="outline">
              <Building2 />
              {profile.department?.name ?? "Unassigned"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TodayStatusCard report={todayReport} />
        <SubmitReportCard alreadySubmitted={!!todayReport} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Your last few daily reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-sm text-muted-foreground">
              Your submitted daily reports will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
