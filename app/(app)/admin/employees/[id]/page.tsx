import { notFound } from "next/navigation";
import { Calendar, LogIn, Mail } from "lucide-react";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getEmployeeDetail } from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { formatDateTime } from "@/lib/helpers/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { ReportHistoryCards } from "@/components/reports/report-history-cards";
import { ReportHistoryTable } from "@/components/reports/report-history-table";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [employee, departments, profile] = await Promise.all([
    getEmployeeDetail(id),
    getAllDepartments(),
    getCurrentProfile(),
  ]);

  if (!employee) {
    notFound();
  }

  const isSelf = employee.id === profile?.id;

  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {employee.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{employee.role}</span>
            <span>·</span>
            <span>{employee.department_name ?? "Unassigned"}</span>
          </div>
        </div>

        <EmployeeActionsMenu
          employee={employee}
          departments={departmentOptions}
          isSelf={isSelf}
          redirectOnDelete="/admin/employees"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <EmployeeStatusBadge status={employee.status} />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Invited
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {employee.invited_at ? formatDateTime(employee.invited_at) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <LogIn className="size-3.5" />
              Last Login
            </CardDescription>
            <CardTitle className="text-base font-medium">
              {employee.last_sign_in_at
                ? formatDateTime(employee.last_sign_in_at)
                : "Never"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
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
            <>
              <ReportHistoryTable reports={employee.recent_reports} />
              <ReportHistoryCards reports={employee.recent_reports} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
