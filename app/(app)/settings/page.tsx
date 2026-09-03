import { LogOut } from "lucide-react";
import {
  getCurrentProfileWithDepartment,
  getCurrentUserEmail,
} from "@/lib/supabase/queries/profile";
import { getReportStatsData } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { formatDate } from "@/lib/helpers/dates";
import { computeReportStats } from "@/lib/helpers/report-stats";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  let supervisors: { id: string; full_name: string; designation: string | null }[] =
    [];

  if (profile.supervisor_ids.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, designation")
      .in("id", profile.supervisor_ids);
    supervisors = data ?? [];
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
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your profile and account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ProfileHeader
            name={profile.full_name}
            designation={profile.designation}
            departmentNames={profile.department_names}
            isRemote={profile.is_remote}
            avatarUrl={profile.avatar_url}
            showUploadButton={true}
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

          {profile.designation && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Designation
              </Label>
              <p className="text-sm">{profile.designation}</p>
            </div>
          )}

          {supervisors.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Reports to
              </Label>
              <p className="text-sm">
                {supervisors.map((supervisor) => supervisor.full_name).join(", ")}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              Member since
            </Label>
            <p className="text-sm">
              {formatDate(profile.created_at.slice(0, 10))}
            </p>
          </div>

          {profile.is_remote && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Remote
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>My Stats</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold">
                {stats.currentStreak}
              </span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold">
                {stats.completionPercentage}%
              </span>
              <span className="text-xs text-muted-foreground">completion</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold">
                {stats.reportsThisMonth}
              </span>
              <span className="text-xs text-muted-foreground">this month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
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
        <CardHeader>
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
