import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { getAdminOverview } from "@/lib/supabase/queries/admin/overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/analytics/stat-card";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { ActivityFeed } from "@/components/analytics/activity-feed";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of Inoma Hub across every department.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Organization
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Employees" value={overview.organization.totalEmployees} />
          <StatCard label="Active Employees" value={overview.organization.activeEmployees} />
          <StatCard label="Archived Employees" value={overview.organization.archivedEmployees} />
          <StatCard label="Managers" value={overview.organization.managers} />
          <StatCard label="Departments" value={overview.organization.departments} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Reporting
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Submitted Today" value={overview.reporting.submittedToday} />
          <StatCard
            label="Organization Completion"
            value={`${overview.reporting.completionPercentage}%`}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CompletionTrendCard
            title="Weekly Completion Trend"
            description="Last 7 days, organization-wide"
            trend={overview.reporting.weeklyTrend}
          />
          <CompletionTrendCard
            title="Monthly Completion Trend"
            description="Last 30 days, organization-wide"
            trend={overview.reporting.monthlyTrend}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Invitations
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending Invites" value={overview.invitations.pendingInvites} />
          <StatCard label="Active Users" value={overview.invitations.activeUsers} />
          <StatCard label="Disabled Users" value={overview.invitations.disabledUsers} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Invitations, archives, new departments, and submitted reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={overview.recentActivity} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/employees">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <Users className="size-5 text-muted-foreground" />
                <CardTitle>Employees</CardTitle>
                <CardDescription>
                  Invite, edit, and activate or deactivate employees.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/departments">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <Building2 className="size-5 text-muted-foreground" />
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Create departments and assign managers.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
