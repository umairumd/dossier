import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { DailyReportPanel } from "@/components/reports/daily-report-panel";
import { PageHeader } from "@/components/shared/page-header";

export default async function DailyReportPage() {
  const [todayReport, profile, settings] = await Promise.all([
    getTodayReport(),
    getCurrentProfile(),
    getOrganizationSettings(),
  ]);

  const isPrivileged =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "manager";

  const subtitle = isPrivileged
    ? "Log today's progress."
    : "Log today's progress for your manager to review.";
  const deadlineHour = String(settings.reportDeadlineHourUtc).padStart(2, "0");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Daily Report">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </PageHeader>

      <DailyReportPanel
        todayReport={todayReport}
        deadlineHint={`Due by ${deadlineHour}:00 UTC`}
        deadlineHourUtc={settings.reportDeadlineHourUtc}
      />
    </div>
  );
}
