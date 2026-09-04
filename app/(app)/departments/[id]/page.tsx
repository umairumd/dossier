import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDepartmentDetail,
  getManagerCandidates,
} from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { formatLongDate } from "@/lib/helpers/dates";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { CompletionTrendCard } from "@/components/analytics/completion-trend-card";
import { DepartmentDetailActions } from "@/components/admin/department-detail-actions";
import { DepartmentMemberActions } from "@/components/admin/department-member-actions";
import { DeptTemplateActions } from "@/components/admin/dept-template-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const totalMembers = detail.members.length;
  const submittedToday = Object.keys(detail.submittedAtByMemberId).length;
  const missingToday = Math.max(totalMembers - submittedToday, 0);
  const completionPct =
    totalMembers === 0 ? 0 : Math.round((submittedToday / totalMembers) * 100);
  const statusLabel = detail.archived_at ? "Archived" : "Active";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/departments"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Departments
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.members.length}{" "}
            {detail.members.length === 1 ? "member" : "members"} · {statusLabel}
          </p>
        </div>
        <DepartmentDetailActions
          department={departmentListItem}
          managerCandidates={managerCandidates}
          managerNote={managerNote}
          addCandidates={addCandidates}
          variant="edit"
        />
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Manager</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.manager ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MemberAvatar name={detail.manager.full_name} size="sm" />
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
              <DepartmentDetailActions
                department={departmentListItem}
                managerCandidates={managerCandidates}
                managerNote={managerNote}
                addCandidates={addCandidates}
                variant="change-manager"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                No manager assigned
              </span>
              <DepartmentDetailActions
                department={departmentListItem}
                managerCandidates={managerCandidates}
                managerNote={managerNote}
                addCandidates={addCandidates}
                variant="assign-manager"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Report Template</CardTitle>
        </CardHeader>
        <CardContent>
          <DeptTemplateActions
            departmentId={detail.id}
            departmentName={detail.name}
            currentTemplateId={detail.template_id}
            templates={templates}
            canCreate
          />
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Today</CardTitle>
          <CardDescription>{formatLongDate(new Date())}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-semibold">
                {submittedToday}/{totalMembers}
              </p>
              <p className="text-xs text-muted-foreground">submitted</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{completionPct}%</p>
              <p className="text-xs text-muted-foreground">completion</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-destructive">
                {missingToday}
              </p>
              <p className="text-xs text-muted-foreground">missing</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CompletionTrendCard
        title="7-Day Completion"
        description="Last 7 days for this department"
        trend={detail.trend}
      />

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Members</CardTitle>
            <DepartmentDetailActions
              department={departmentListItem}
              managerCandidates={managerCandidates}
              managerNote={managerNote}
              addCandidates={addCandidates}
              variant="add-member"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {detail.members.length === 0 ? (
            <EmptyState
              illustration="team"
              title="No members in this department yet."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {detail.members.map((member) => {
                const submittedAt =
                  detail.submittedAtByMemberId[member.id] ?? null;

                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between px-6 py-3"
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
                            <Badge variant="secondary" className="text-xs">
                              Manager
                            </Badge>
                          )}
                          {!member.has_onboarded && (
                            <Badge variant="outline" className="text-xs">
                              Invited
                            </Badge>
                          )}
                          {member.is_remote && (
                            <Badge variant="outline" className="text-xs">
                              Remote
                            </Badge>
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
