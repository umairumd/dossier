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
import { partitionReporters } from "@/lib/helpers/report-stats";
import Link from "next/link";
import { CompletionBars } from "@/components/analytics/completion-bars";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { getDepartmentBoard } from "@/lib/supabase/queries/tasks";
import { cn } from "@/lib/utils";
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

  const [detail, allManagers, employees, settings, templates, boardTasks] = await Promise.all([
    getDepartmentDetail(id),
    getManagerCandidates(),
    getAllEmployees(),
    getOrganizationSettings(),
    getOrgTemplates(),
    getDepartmentBoard(id).catch(() => []),
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
  const onLeaveIds = new Set(detail.onLeaveMemberIds);
  const partition = partitionReporters(
    reportingMembers.map((member) => ({
      id: member.id,
      hasReport: detail.submittedAtByMemberId[member.id] != null,
      attendanceStatus: onLeaveIds.has(member.id) ? ("leave" as const) : null,
    })),
  );
  const submittedToday = partition.submitted.length;
  const totalCount = reportingMembers.length;
  // With no reporting members there is nothing to measure; show "—" rather
  // than a misleading 0/0 and 0%.
  const hasReportingMembers = totalCount > 0;
  const expectedToday = partition.expected;
  const missingToday = partition.missing.length;
  const awayToday = partition.away.length;
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

  const average =
    trend.length > 0 ? Math.round(trend.reduce((sum, point) => sum + point.completionPercentage, 0) / trend.length) : null;
  const delta = average != null && previousAverage != null ? average - previousAverage : null;
  const openTasks = boardTasks.filter((task) => task.status !== "done");
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today).length;
  const statusOf = (memberId: string) =>
    getSubmissionStatus(
      detail.submittedAtByMemberId[memberId] ?? null,
      deadline.deadlineHourUtc,
      deadline,
      today,
      onLeaveIds.has(memberId),
    );
  // Short names under the faces; two words where first names repeat
  // ("Muhammad Umer", "Muhammad Wasif").
  const firstCounts = new Map<string, number>();
  for (const member of reportingMembers) {
    const first = member.full_name.trim().split(/\s+/)[0];
    firstCounts.set(first, (firstCounts.get(first) ?? 0) + 1);
  }
  const shortName = (fullName: string) => {
    const words = fullName.trim().split(/\s+/);
    return (firstCounts.get(words[0]) ?? 0) > 1 && words[1] ? `${words[0]} ${words[1]}` : words[0];
  };
  const FACE_DOT: Record<string, string> = {
    on_time: "bg-ok",
    late: "bg-warn",
    missed: "bg-danger",
    pending: "bg-fill-active",
    on_leave: "bg-info",
    off: "bg-fill-active",
  };
  const FACE_LABEL: Record<string, string> = {
    on_time: "Reported",
    late: "Reported late",
    missed: "Missed",
    pending: "Not yet",
    on_leave: "On leave",
    off: "Day off",
  };

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={detail.name} />
      <PageHeader
        title={detail.name}
        description={
          <>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {detail.archived_at && <Badge variant="neutral">Archived</Badge>}
              <span>{detail.members.length} {detail.members.length === 1 ? "person" : "people"}</span>
              {detail.manager ? (
                <Link
                  href={`/employees/${detail.manager.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <MemberAvatar
                    userId={detail.manager.id}
                    name={detail.manager.full_name}
                    avatar={detail.manager.avatar}
                    size="xs"
                  />
                  Managed by {detail.manager.full_name}
                </Link>
              ) : (
                <span>No manager yet</span>
              )}
              <span>Report template: {currentTemplate ? currentTemplate.name : "organization default"}</span>
            </span>
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <DepartmentDetailActions variant="edit" {...actionProps} />
            <DeptTemplateActions
              departmentId={detail.id}
              departmentName={detail.name}
              currentTemplateId={detail.template_id}
              templates={templates}
              canCreate
              variant="menu"
            />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="surface-card flex min-w-0 flex-col gap-1 rounded-xl bg-card px-3 py-3 sm:px-5 sm:py-4">
          <span className="text-xs text-muted-foreground sm:text-[13px]">Reported today</span>
          <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {hasReportingMembers ? (
              <>
                {submittedToday} <span className="text-base font-normal text-muted-foreground">of {expectedToday}</span>
              </>
            ) : (
              "None expected"
            )}
          </span>
          <span className="text-xs text-muted-foreground max-sm:hidden">
            {[
              deadlinePassed
                ? missingToday > 0
                  ? `${missingToday} missing`
                  : "Everyone reported"
                : expectedToday - submittedToday > 0
                  ? `${expectedToday - submittedToday} still to report`
                  : "Everyone reported",
              awayToday > 0 ? `${awayToday} away` : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
        <div className="surface-card flex min-w-0 flex-col gap-1 rounded-xl bg-card px-3 py-3 sm:px-5 sm:py-4">
          <span className="text-xs text-muted-foreground sm:text-[13px]">30-day completion</span>
          <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{average != null ? `${average}%` : "None yet"}</span>
          <span className={cn("text-xs max-sm:hidden", delta == null ? "text-muted-foreground" : delta >= 0 ? "text-ok" : "text-danger")}>
            {delta == null ? "Working days only" : `${delta >= 0 ? "Up" : "Down"} ${Math.abs(delta)} pts on the 30 days before`}
          </span>
        </div>
        <Link
          href={`/tasks?view=team&board=${detail.id}`}
          className="surface-card flex min-w-0 flex-col gap-1 rounded-xl bg-card px-3 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-fill-subtle"
        >
          <span className="text-xs text-muted-foreground sm:text-[13px]">Open tasks</span>
          <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{openTasks.length}</span>
          <span className={cn("text-xs max-sm:hidden", overdueTasks ? "text-danger" : "text-muted-foreground")}>
            {overdueTasks ? `${overdueTasks} overdue` : "Open the board"}
          </span>
        </Link>
      </div>

      {reportingMembers.length > 0 ? (
        <Card>
          <CardTitleHeader title="Today" aside={<span className="max-sm:hidden">Click someone to open their profile</span>} />
          <CardContent>
            <ul className="grid grid-cols-4 gap-x-1 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-2">
              {reportingMembers.map((member) => {
                const status = statusOf(member.id);
                return (
                  <li key={member.id} className="min-w-0 sm:w-24">
                    <Link
                      href={`/employees/${member.id}`}
                      className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-center hover:bg-fill-hover"
                    >
                      <span className="relative">
                        <MemberAvatar
                          userId={member.id}
                          name={member.full_name}
                          avatar={member.avatar}
                          size="lg"
                          className={status === "on_leave" ? "opacity-60" : undefined}
                        />
                        <span
                          className={cn("absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-card", FACE_DOT[status])}
                          aria-hidden
                        />
                      </span>
                      <span className="line-clamp-2 w-full text-xs leading-tight font-medium">{shortName(member.full_name)}</span>
                      <span className="text-[11px] text-muted-foreground">{FACE_LABEL[status]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {hasReportingMembers && trend.length > 0 ? (
        <Card>
          <CardTitleHeader title="Report completion" aside="Last 30 working days" />
          <CardContent>
            <CompletionBars trend={trend} />
          </CardContent>
        </Card>
      ) : null}

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
