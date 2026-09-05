import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDepartmentDetail,
  getManagerCandidates,
} from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { StatCard } from "@/components/analytics/stat-card";
import { DepartmentDetailActions } from "@/components/admin/department-detail-actions";
import { DepartmentMemberActions } from "@/components/admin/department-member-actions";
import { DeptTemplateActions } from "@/components/admin/dept-template-actions";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ManagerIndicator,
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentListItem } from "@/types/department";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, allManagers, employees, settings, templates] = await Promise.all([
    getDepartmentDetail(id),
    getManagerCandidates(),
    getAllEmployees(),
    getOrganizationSettings(),
    getOrgTemplates(),
  ]);

  if (!detail) {
    notFound();
  }

  const deadline = getDeadlineContext(settings);

  const memberIds = new Set(detail.members.map((member) => member.id));
  const managersInDepartment = allManagers.filter((manager) =>
    memberIds.has(manager.id),
  );
  const useOrgManagers = managersInDepartment.length === 0;
  const managerCandidates = useOrgManagers ? allManagers : managersInDepartment;
  const managerNote = useOrgManagers
    ? "Manager will be added to this department automatically."
    : undefined;

  const departmentListItem: DepartmentListItem = {
    id: detail.id,
    name: detail.name,
    organization_id: detail.organization_id,
    manager_id: detail.manager_id,
    manager_name: detail.manager?.full_name ?? null,
    employee_count: detail.members.length,
    archived_at: detail.archived_at,
    created_at: detail.created_at,
    template_id: detail.template_id,
  };

  const addCandidates = employees.filter(
    (employee) =>
      employee.status !== "archived" && !memberIds.has(employee.id),
  );

  const reportingMembers = detail.members.filter((member) => member.has_onboarded);
  const submittedToday = Object.keys(detail.submittedAtByMemberId).length;
  const totalCount = reportingMembers.length;
  const missingToday = Math.max(totalCount - submittedToday, 0);
  const completionPct =
    totalCount === 0 ? 0 : Math.round((submittedToday / totalCount) * 100);

  const currentTemplate = detail.template_id
    ? (templates.find((template) => template.id === detail.template_id) ?? null)
    : null;

  const actionProps = {
    department: departmentListItem,
    managerCandidates,
    managerNote,
    addCandidates,
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="card-gradient">
        <CardContent className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{detail.name}</h1>
              {detail.archived_at && (
                <Badge variant="outline">Archived</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {detail.members.length} member
              {detail.members.length !== 1 ? "s" : ""}
              {detail.manager && (
                <> · Manager: {detail.manager.full_name}</>
              )}
            </p>
          </div>
          <DepartmentDetailActions variant="edit" {...actionProps} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="card-gradient">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Manager</CardTitle>
              <DepartmentDetailActions
                variant={detail.manager ? "change-manager" : "assign-manager"}
                {...actionProps}
              />
            </div>
          </CardHeader>
          <CardContent>
            {detail.manager ? (
              <div className="flex items-center gap-3">
                <MemberAvatar name={detail.manager.full_name} size="md" />
                <div>
                  <p className="text-sm font-medium">
                    {detail.manager.full_name}
                  </p>
                  {detail.manager.designation && (
                    <p className="text-xs text-muted-foreground">
                      {detail.manager.designation}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No manager assigned
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Report Template</CardTitle>
              <DeptTemplateActions
                departmentId={detail.id}
                departmentName={detail.name}
                currentTemplateId={detail.template_id}
                templates={templates}
                canCreate
                showCurrentName={false}
              />
            </div>
          </CardHeader>
          <CardContent>
            {currentTemplate ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{currentTemplate.name}</p>
                <p className="text-xs text-muted-foreground">
                  {currentTemplate.fieldCount ?? 0} fields
                  {currentTemplate.isDefault ? " · Org default" : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Using org default
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          label="Submitted Today"
          value={`${submittedToday}/${totalCount}`}
          icon={<CheckCircle className="size-4" />}
        />
        <StatCard
          label="Completion"
          value={`${completionPct}%`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Missing"
          value={missingToday}
          icon={<AlertCircle className="size-4" />}
          valueClassName={
            missingToday > 0 ? "text-destructive" : undefined
          }
        />
      </div>

      <CompletionTrendCard
        title="7-Day Completion"
        description="Last 7 days for this department"
        trend={detail.trend}
      />

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Members</CardTitle>
            <DepartmentDetailActions variant="add-member" {...actionProps} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {detail.members.length === 0 ? (
            <EmptyState
              illustration="team"
              title="No members in this department yet."
              className="py-6"
            />
          ) : (
            <ul className="divide-y divide-border">
              {detail.members.map((member) => {
                const submittedAt =
                  detail.submittedAtByMemberId[member.id] ?? null;

                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar name={member.full_name} size="sm" />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/employees/${member.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {member.full_name}
                          </Link>
                          {member.id === detail.manager_id && (
                            <ManagerIndicator />
                          )}
                          {!member.has_onboarded && (
                            <Badge variant="outline" className="text-xs">
                              Invited
                            </Badge>
                          )}
                          {member.is_remote && <RemoteIndicator />}
                          {member.employment_type === "part_time" && (
                            <PartTimeIndicator />
                          )}
                        </div>
                        {member.designation && (
                          <span className="text-xs text-muted-foreground">
                            {member.designation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {submittedAt ? (
                        <SubmissionStatusBadge
                          status={getSubmissionStatus(
                            submittedAt,
                            deadline.deadlineHourUtc,
                            deadline,
                          )}
                        />
                      ) : member.has_onboarded ? (
                        <SubmissionStatusBadge status="missed" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Invited
                        </Badge>
                      )}
                      <DepartmentMemberActions
                        employeeId={member.id}
                        departmentId={detail.id}
                        employeeName={member.full_name}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
