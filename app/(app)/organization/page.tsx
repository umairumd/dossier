import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { OrgIdentityForm } from "@/components/admin/org-identity-form";
import { OrgScheduleForm } from "@/components/admin/org-schedule-form";

export default async function OrganizationSettingsPage() {
  const [profile, settings, orgName] = await Promise.all([
    getCurrentProfile(),
    getOrganizationSettings(),
    getOrganizationName(),
  ]);

  if (profile?.role !== "owner") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organization" />

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            How your organization appears in Dossier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgIdentityForm initialName={settings.orgName ?? orgName} />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>
            Configure when reports are due and which days count as working days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgScheduleForm
            initialTimezone={settings.timezone}
            initialWorkingDays={settings.workingDays}
            initialDeadlineHour={settings.reportDeadlineHourLocal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
