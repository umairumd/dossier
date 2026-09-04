import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
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

export default async function OrganizationSettingsPage() {
  const [profile, settings, orgName, templates] = await Promise.all([
    getCurrentProfile(),
    getOrganizationSettings(),
    getOrganizationName(),
    getOrgTemplates(),
  ]);

  if (profile?.role !== "owner") {
    redirect("/");
  }

  const activeTemplates = templates.filter((template) => !template.archivedAt);

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

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>
                Manage templates for daily report submissions. Assign different
                templates to departments or individual employees.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/organization/templates/new">
                <Plus className="mr-1.5 size-4" />
                New Template
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTemplates.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No templates yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activeTemplates.map((template) => {
                const count = template.fieldCount ?? 0;
                return (
                  <li
                    key={template.id}
                    className="flex items-center justify-between gap-3 px-6 py-3"
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
                    <Link
                      href={`/organization/templates/${template.id}`}
                      className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border px-6 py-3">
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
