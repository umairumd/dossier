import { notFound } from "next/navigation";
import { Building2, Calendar, Mail, MapPin, UserCheck } from "lucide-react";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees, getEmployeeDetail } from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { formatDate } from "@/lib/helpers/dates";
import { ProfileHeader } from "@/components/shared/profile-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [employee, profile, allDepartments, employees, orgName, settings] =
    await Promise.all([
      getEmployeeDetail(id),
      getCurrentProfile(),
      getAllDepartments(),
      getAllEmployees(),
      getOrganizationName(),
      getOrganizationSettings(),
    ]);

  if (!employee) {
    notFound();
  }

  const isSelf = employee.id === profile?.id;
  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));
  const candidates = employees.filter((item) => item.id !== employee.id);
  const supervisorNames = candidates
    .filter((candidate) => employee.supervisor_ids.includes(candidate.id))
    .map((candidate) => candidate.full_name);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ProfileHeader
          name={employee.full_name}
          designation={employee.designation}
          departmentNames={employee.department_names}
          isRemote={employee.is_remote}
          avatarUrl={employee.avatar_url}
        />

        <EmployeeActionsMenu
          employee={employee}
          isSelf={isSelf}
          departments={departments}
          candidates={candidates}
          orgName={orgName}
          redirectOnDelete="/admin/employees"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="card-gradient">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Mail className="size-3.5" />
              Email
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {employee.email ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-gradient">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <EmployeeStatusBadge status={employee.status} />
            </CardTitle>
            {employee.last_sign_in_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last login: {formatDate(employee.last_sign_in_at.slice(0, 10))}
              </p>
            )}
          </CardHeader>
        </Card>

        <Card className="card-gradient">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Member Since
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {formatDate(employee.created_at.slice(0, 10))}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-gradient">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              Departments
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {employee.department_names.join(", ") || "Unassigned"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-gradient">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <UserCheck className="size-3.5" />
              Reports To
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {supervisorNames.join(", ") || "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-gradient">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              {employee.is_remote ? (
                <MapPin className="size-3.5" />
              ) : (
                <Building2 className="size-3.5" />
              )}
              Work location
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {employee.is_remote ? "Remote" : "On-site"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="card-gradient">
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{employee.stats.currentStreak}</p>
            <p className="mt-1 text-xs text-muted-foreground">day streak</p>
          </CardContent>
        </Card>
        <Card className="card-gradient">
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">
              {employee.stats.completionPercentage}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              30-day completion
            </p>
          </CardContent>
        </Card>
        <Card className="card-gradient">
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">
              {employee.stats.reportsThisMonth}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>
            {employee.report_count}{" "}
            {employee.report_count === 1 ? "report" : "reports"} submitted in
            total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employee.recent_reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reports submitted yet.
            </p>
          ) : (
            <ReportHistoryBrowser
              reports={employee.recent_reports}
              userName={employee.full_name}
              deadline={getDeadlineContext(settings)}
              departmentName={
                employee.department_names.join(", ") || "Unassigned"
              }
              adminView
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
