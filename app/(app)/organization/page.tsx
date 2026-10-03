import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getAttendanceSettings } from "@/lib/supabase/queries/attendance";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { OrgIdentityForm } from "@/components/admin/org-identity-form";
import { OrgScheduleForm } from "@/components/admin/org-schedule-form";
import { OrgAttendanceForm } from "@/components/admin/org-attendance-form";

export default async function OrganizationSettingsPage() {
  const [profile, settings, orgName, templates, attendanceSettings] =
    await Promise.all([
      getCurrentProfile(),
      getOrganizationSettings(),
      getOrganizationName(),
      getOrgTemplates(),
      getAttendanceSettings(),
    ]);

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/");
  }

  const activeTemplates = templates.filter((template) => !template.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organization" />

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>
            How your organization appears in Dossier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgIdentityForm initialName={orgName ?? settings.orgName} />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
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

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Attendance</CardTitle>
          <CardDescription>
            Configure shift times, grace periods, and fine amounts for
            attendance tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgAttendanceForm
            initialGraceMinutes={attendanceSettings.graceMinutes}
            initialFineLate={attendanceSettings.fineLateAmount}
            initialFineVeryLate={attendanceSettings.fineVeryLateAmount}
            initialFineUninformed={attendanceSettings.fineUninformedAmount}
            initialInformedLeaves={attendanceSettings.informedLeavesPerMonth}
            initialShiftFulltimeStart={attendanceSettings.shiftFulltimeStart}
            initialShiftMorningStart={attendanceSettings.shiftMorningStart}
            initialShiftMorningEnd={attendanceSettings.shiftMorningEnd}
            initialShiftEveningStart={attendanceSettings.shiftEveningStart}
            initialShiftEveningEnd={attendanceSettings.shiftEveningEnd}
          />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Report Templates</CardTitle>
              <CardDescription>
                Manage templates for daily report submissions. Assign different
                templates to departments or individual employees.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/organization/templates/new">
                <Plus className="size-4" />
                New Template
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTemplates.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<FileText className="size-4" />}
              title="No templates yet."
            />
          ) : (
            <ul className="divide-y divide-border">
              {activeTemplates.map((template) => {
                const count = template.fieldCount ?? 0;
                return (
                  <li key={template.id}>
                    <Link
                      href={`/organization/templates/${template.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-foreground/5 sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {template.name}
                        </span>
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {count} field{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        Edit
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border px-4 py-3 sm:px-6">
            <Link
              href="/organization/templates"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Manage all templates →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
