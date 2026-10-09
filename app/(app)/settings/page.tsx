import { Calendar, Flame, LogOut, TrendingUp } from "lucide-react";
import { SignOutForm } from "@/components/auth/sign-out-form";
import {
  getCurrentProfileWithDepartment,
  getCurrentUserEmail,
} from "@/lib/supabase/queries/profile";
import { getReportStatsData } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { createClient } from "@/lib/supabase/server";
import { dateNDaysAgo, formatDate } from "@/lib/helpers/dates";
import {
  buildAttendanceStatusMap,
  computeReportStats,
} from "@/lib/helpers/report-stats";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { AttendanceStatus } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/shared/settings-section";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsProfileBuddy } from "@/components/settings/settings-profile-buddy";
import { PageHeader } from "@/components/shared/page-header";
import { FigureStrip } from "@/components/shared/figure-strip";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [profile, email, statsRows, settings, attendanceResult] =
    await Promise.all([
      getCurrentProfileWithDepartment(),
      getCurrentUserEmail(),
      getReportStatsData(),
      getOrganizationSettings(),
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { data: [] };
        return supabase
          .from("attendance_records")
          .select("date, status")
          .eq("profile_id", user.id)
          .gte("date", dateNDaysAgo(399));
      })(),
    ]);

  if (!profile) {
    return null;
  }

  const stats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(
      (attendanceResult.data as { date: string; status: AttendanceStatus }[]) ??
        [],
    ),
  });

  const figures = [
    { icon: <Flame className="size-4" />, label: "Current streak", value: stats.currentStreak, unit: stats.currentStreak === 1 ? "day" : "days" },
    { icon: <TrendingUp className="size-4" />, label: "30-day completion", value: `${stats.completionPercentage}%`, unit: "" },
    { icon: <Calendar className="size-4" />, label: "This month", value: stats.reportsThisMonth, unit: stats.reportsThisMonth === 1 ? "report" : "reports" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Your profile, password and session."
      />

      <section className="surface-card rounded-xl bg-card p-5 md:p-6">
        <SettingsProfileBuddy
          userId={profile.id}
          name={profile.full_name}
          designation={profile.designation}
          departmentNames={profile.department_names}
          isRemote={profile.is_remote}
          employmentType={profile.employment_type}
          avatar={profile.avatar}
          roleLabel={getRoleLabel(profile.role)}
          joinedLabel={`Joined ${formatDate(profile.created_at.slice(0, 10))}`}
        />
      </section>

      <ProfileForm
        initialFullName={profile.full_name}
        initialDob={profile.date_of_birth ?? null}
        email={email}
        role={getRoleLabel(profile.role)}
        departmentName={profile.department_names.join(", ") || "Unassigned"}
      />

      <SettingsSection title="Your reporting" description="The last 30 days.">
        <FigureStrip
          variant="inset"
          figures={figures.map((figure) => ({
            ...figure,
            unit: figure.unit || undefined,
          }))}
        />
      </SettingsSection>

      <ChangePasswordForm />

      <SettingsSection title="Session" description="Sign out of Dossier on this device.">
        <SignOutForm>
          <Button type="submit" variant="outline" className="self-start">
            <LogOut />
            Sign out
          </Button>
        </SignOutForm>
      </SettingsSection>
    </div>
  );
}
