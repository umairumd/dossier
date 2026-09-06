import { Calendar, Flame, LogOut, TrendingUp } from "lucide-react";
import {
  getCurrentProfileWithDepartment,
  getCurrentUserEmail,
} from "@/lib/supabase/queries/profile";
import { getReportStatsData } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { logout } from "@/lib/actions/auth";
import { formatDate } from "@/lib/helpers/dates";
import { computeReportStats } from "@/lib/helpers/report-stats";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { StatCard } from "@/components/analytics/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProfileHeader } from "@/components/shared/profile-header";

export default async function SettingsPage() {
  const [profile, email, statsRows, settings] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getCurrentUserEmail(),
    getReportStatsData(),
    getOrganizationSettings(),
  ]);

  if (!profile) {
    return null;
  }

  const stats = computeReportStats(statsRows, settings.timezone);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your personal information and account security.
        </p>
      </div>

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ProfileHeader
            userId={profile.id}
            name={profile.full_name}
            designation={profile.designation}
            departmentNames={profile.department_names}
            isRemote={profile.is_remote}
            employmentType={profile.employment_type}
            avatarUrl={profile.avatar_url}
            avatarSize="xl"
            roleLabel={getRoleLabel(profile.role)}
            joinedLabel={`Joined ${formatDate(profile.created_at.slice(0, 10))}`}
          />

          <Separator />

          <ProfileForm
            initialFullName={profile.full_name}
            email={email}
            role={getRoleLabel(profile.role)}
            departmentName={
              profile.department_names.join(", ") || "Unassigned"
            }
          />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <CardTitle>Performance</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard
              label="Current Streak"
              value={stats.currentStreak}
              unit="days"
              icon={<Flame className="size-4" />}
            />
            <StatCard
              label="30-Day Completion"
              value={`${stats.completionPercentage}%`}
              icon={<TrendingUp className="size-4" />}
            />
            <StatCard
              label="This Month"
              value={stats.reportsThisMonth}
              unit="reports"
              icon={<Calendar className="size-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of Dossier on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline">
              <LogOut />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
