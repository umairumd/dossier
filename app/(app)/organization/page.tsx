import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getAttendanceSettings } from "@/lib/supabase/queries/attendance";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { getOrgHandbookDocs } from "@/lib/supabase/queries/admin/handbook";
import { HandbookKindTag } from "@/components/handbook/kind-tag";
import { docStatus } from "@/lib/handbook/format";
import { SettingsSection } from "@/components/shared/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { OrgIdentityForm } from "@/components/admin/org-identity-form";
import { OrgScheduleForm } from "@/components/admin/org-schedule-form";
import { OrgAttendanceForm } from "@/components/admin/org-attendance-form";

export default async function OrganizationSettingsPage() {
  const [profile, settings, orgName, templates, attendanceSettings, handbookDocs] =
    await Promise.all([
      getCurrentProfile(),
      getOrganizationSettings(),
      getOrganizationName(),
      getOrgTemplates(),
      getAttendanceSettings(),
      getOrgHandbookDocs(),
    ]);

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/");
  }

  const activeTemplates = templates.filter((template) => !template.archivedAt);
  const activeDocs = handbookDocs.filter((doc) => !doc.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organization"
        description={`How ${orgName ?? settings.orgName ?? "your organization"} works in Dossier.`}
      />

      <OrgIdentityForm initialName={orgName ?? settings.orgName} />

      <OrgScheduleForm
        initialTimezone={settings.timezone}
        initialWorkingDays={settings.workingDays}
        initialDeadlineHour={settings.reportDeadlineHourLocal}
        canEditCalendar={profile?.role === "owner"}
      />

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

      <SettingsSection
        title="Report templates"
        description="The questions people answer each day. Assign templates to departments or to individual people."
        aside={
          <Button asChild variant="outline" size="sm">
            <Link href="/organization/templates/new">
              <Plus className="size-4" />
              New template
            </Link>
          </Button>
        }
      >
        {activeTemplates.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<FileText className="size-4" />}
            title="No templates yet."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl ring-1 ring-inset ring-edge">
              {activeTemplates.map((template) => {
                const count = template.fieldCount ?? 0;
                return (
                  <li key={template.id}>
                    <Link
                      href={`/organization/templates/${template.id}`}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{template.name}</span>
                        {template.isDefault && <Badge variant="neutral">Default</Badge>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">
                        {count} {count === 1 ? "question" : "questions"}
                        <ChevronRight aria-hidden className="size-4" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/organization/templates"
              className="self-start text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Manage all templates
            </Link>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Handbook"
        description="Policies, SOPs, job descriptions and guides. Choose who can see each one and who must confirm they've read it."
        aside={
          <Button asChild variant="outline" size="sm">
            <Link href="/organization/handbook/new">
              <Plus className="size-4" />
              New document
            </Link>
          </Button>
        }
      >
        {activeDocs.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<BookOpen className="size-4" />}
            title="No handbook documents yet."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl ring-1 ring-inset ring-edge">
              {activeDocs.slice(0, 5).map((doc) => {
                const status = docStatus(doc);
                return (
                  <li key={doc.id}>
                    <Link
                      href={`/organization/handbook/${doc.id}`}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <HandbookKindTag kind={doc.kind} />
                        <span className="truncate text-sm font-medium">{doc.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/organization/handbook"
              className="self-start text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {activeDocs.length > 5
                ? `Manage all ${activeDocs.length} documents`
                : "Manage the handbook"}
            </Link>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
