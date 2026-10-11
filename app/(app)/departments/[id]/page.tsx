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
import { todayInTimezone } from "@/lib/helpers/dates";
import { completionWindows } from "@/lib/helpers/completion-trend";
import { CompletionLineChart } from "@/components/analytics/completion-line-chart";
import { DataList, DataListRow, PersonCell } from "@/components/shared/data-list";
import { GroupHeading } from "@/components/shared/person-card";
import { PageHeader } from "@/components/shared/page-header";
import { DepartmentDetailActions } from "@/components/admin/department-detail-actions";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { DepartmentMemberActions } from "@/components/admin/department-member-actions";
import { DeptTemplateActions } from "@/components/admin/dept-template-actions";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ManagerIndicator,
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
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
    manager_avatar: detail.manager?.avatar ?? null,
    employee_count: detail.members.length,
    archived_at: detail.archived_at,
    created_at: detail.created_at,
    template_id: detail.template_id,
  };

  const addCandidates = employees.filter(
    (employee) =>
      employee.status !== "archived" && !memberIds.has(employee.id),
  );

  const reportingMembers = detail.members.filter(
    (member) => member.has_onboarded && member.is_reporting,
  );
  const reportingIds = new Set(reportingMembers.map((member) => member.id));
  const onLeaveIds = new Set(detail.onLeaveMemberIds);
  const submittedToday = Object.keys(detail.submittedAtByMemberId).filter(
    (id) => reportingIds.has(id),
  ).length;
  const totalCount = reportingMembers.length;
  // With no reporting members there is nothing to measure; show "—" rather
  // than a misleading 0/0 and 0%.
  const hasReportingMembers = totalCount > 0;
  const expectedToday = reportingMembers.filter(
    (member) => !onLeaveIds.has(member.id),
  ).length;
  const missingToday = Math.max(expectedToday - submittedToday, 0);
  const today = todayInTimezone(settings.timezone);

  const currentTemplate = detail.template_id
    ? (templates.find((template) => template.id === detail.template_id) ?? null)
    : null;

  const actionProps = {
    department: departmentListItem,
    managerCandidates,
    managerNote,
    addCandidates,
  };

  const deadlinePassed =
    getSubmissionStatus(null, deadline.deadlineHourUtc, deadline, today) === "missed";
  const { trend, previousAverage } = completionWindows(detail.trend, today, deadlinePassed);

  // At most one middle dot: the department, then today.
  const who = `${detail.members.length} ${detail.members.length === 1 ? "person" : "people"}, ${detail.manager ? `managed by ${detail.manager.full_name}` : "no manager"}`;
  const description = hasReportingMembers
    ? `${who} · ${submittedToday} of ${totalCount} in today${missingToday > 0 && deadlinePassed ? `, ${missingToday} missing` : ""}`
    : who;

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={detail.name} />
      <PageHeader
        title={detail.name}
        description={
          <>
            {detail.archived_at && <Badge variant="neutral" className="mr-1.5">Archived</Badge>}
            {description}
          </>
        }
        action={<DepartmentDetailActions variant="edit" {...actionProps} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitleHeader
            title="Manager"
            aside={
              <DepartmentDetailActions
                variant={detail.manager ? "change-manager" : "assign-manager"}
                {...actionProps}
              />
            }
          />
          <CardContent>
            {detail.manager ? (
              <PersonCell
                id={detail.manager.id}
                name={detail.manager.full_name}
                avatar={detail.manager.avatar}
                detail={detail.manager.designation ?? undefined}
                href={`/employees/${detail.manager.id}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No manager assigned</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardTitleHeader
            title="Report template"
            aside={
              <DeptTemplateActions
                departmentId={detail.id}
                departmentName={detail.name}
                currentTemplateId={detail.template_id}
                templates={templates}
                canCreate
                showCurrentName={false}
              />
            }
          />
          <CardContent>
            {currentTemplate ? (
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{currentTemplate.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {currentTemplate.fieldCount ?? 0}{" "}
                  {(currentTemplate.fieldCount ?? 0) === 1 ? "question" : "questions"}
                  {currentTemplate.isDefault ? " · organization default" : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Using the organization default</p>
            )}
          </CardContent>
        </Card>
      </div>

      {hasReportingMembers && (
        <CompletionLineChart
          title="Department completion"
          trend={trend}
          previousAverage={previousAverage}
          today={today}
        />
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <GroupHeading label="Members" count={detail.members.length} className="mb-0" />
          <DepartmentDetailActions variant="add-member" {...actionProps} />
        </div>
        {detail.members.length === 0 ? (
          <EmptyState illustration="team" title="No members in this department yet." className="py-6" />
        ) : (
          <DataList
            columns="minmax(0,1fr) 7.5rem 2rem"
            header={["Person", "Today", ""]}
          >
            {detail.members.map((member) => {
              const submittedAt = detail.submittedAtByMemberId[member.id] ?? null;
              return (
                <DataListRow
                  key={member.id}
                  href={`/employees/${member.id}`}
                  label={`Open ${member.full_name}`}
                >
                  <PersonCell
                    id={member.id}
                    name={member.full_name}
                    avatar={member.avatar}
                    detail={member.designation ?? undefined}
                    addon={
                      <>
                        {member.id === detail.manager_id && <ManagerIndicator />}
                        {member.is_remote && <RemoteIndicator />}
                        {member.employment_type === "part_time" && <PartTimeIndicator />}
                      </>
                    }
                  />
                  <span className="flex items-center gap-2">
                    {member.has_onboarded ? (
                      <SubmissionStatusBadge
                        status={getSubmissionStatus(
                          submittedAt,
                          deadline.deadlineHourUtc,
                          deadline,
                          today,
                          onLeaveIds.has(member.id),
                        )}
                      />
                    ) : (
                      <Badge variant="neutral">Invited</Badge>
                    )}
                    <span className="relative z-10 md:hidden">
                      <DepartmentMemberActions
                        employeeId={member.id}
                        departmentId={detail.id}
                        employeeName={member.full_name}
                      />
                    </span>
                  </span>
                  <span className="relative z-10 hidden justify-end md:flex">
                    <DepartmentMemberActions
                      employeeId={member.id}
                      departmentId={detail.id}
                      employeeName={member.full_name}
                    />
                  </span>
                </DataListRow>
              );
            })}
          </DataList>
        )}
      </section>
    </div>
  );
}
