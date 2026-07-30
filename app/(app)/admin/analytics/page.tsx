import { getOrganizationTrends } from "@/lib/supabase/queries/admin/analytics";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";

export default async function AdminAnalyticsPage() {
  const trends = await getOrganizationTrends();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide completion trends.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CompletionTrendCard
          title="Weekly Completion Trend"
          description="Last 7 days, organization-wide"
          trend={trends.weeklyTrend}
        />
        <CompletionTrendCard
          title="Monthly Completion Trend"
          description="Last 30 days, organization-wide"
          trend={trends.monthlyTrend}
        />
      </div>
    </div>
  );
}
