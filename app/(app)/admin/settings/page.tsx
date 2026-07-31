import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportDeadlineForm } from "@/components/admin/report-deadline-form";

export default async function OrganizationSettingsPage() {
  const settings = await getOrganizationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuration that applies across the whole organization.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Report Deadline</CardTitle>
          <CardDescription>
            Controls when a submitted report counts as On Time vs. Late
            across every dashboard and report list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportDeadlineForm initialHourUtc={settings.reportDeadlineHourUtc} />
        </CardContent>
      </Card>
    </div>
  );
}
