import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { ReportBanner } from "@/components/shared/report-banner";
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
  const deadline = getDeadlineContext(settings);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Daily Report">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </PageHeader>

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
      />
    </div>
  );
}
