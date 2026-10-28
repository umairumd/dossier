import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import HomeLoading from "../../../(home)/loading";
import TeamReportsLoading from "../../../(team)/team-reports/loading";
import TeamMembersLoading from "../../../(team)/team/loading";
import ActivityLoading from "../../../activity/loading";
import AttendanceLoading from "../../../attendance/loading";
import BirthdaysLoading from "../../../birthdays/loading";
import DepartmentLoading from "../../../departments/[id]/loading";
import DepartmentsLoading from "../../../departments/loading";
import EmployeeLoading from "../../../employees/[id]/loading";
import EmployeesLoading from "../../../employees/loading";
import InvitationsLoading from "../../../invitations/loading";
import HandbookLoading from "../../../handbook/loading";
import HandbookDocLoading from "../../../handbook/[slug]/loading";
import OrganizationLoading from "../../../organization/loading";
import HandbookAdminLoading from "../../../organization/handbook/loading";
import HandbookEditorLoading from "../../../organization/handbook/[id]/loading";
import TemplateLoading from "../../../organization/templates/[id]/loading";
import TemplatesLoading from "../../../organization/templates/loading";
import ReportsLoading from "../../../reports/loading";
import SettingsLoading from "../../../settings/loading";
import TrackReportsLoading from "../../../track-reports/loading";

// Development only: renders a route's loading state on its own, so skeletons
// can be compared with the real page (/dev/skeletons/employees next to
// /employees). Returns 404 in production.
const LOADERS: Record<string, ComponentType> = {
  home: HomeLoading,
  "team-reports": TeamReportsLoading,
  team: TeamMembersLoading,
  activity: ActivityLoading,
  attendance: AttendanceLoading,
  birthdays: BirthdaysLoading,
  department: DepartmentLoading,
  departments: DepartmentsLoading,
  employee: EmployeeLoading,
  employees: EmployeesLoading,
  invitations: InvitationsLoading,
  handbook: HandbookLoading,
  "handbook-doc": HandbookDocLoading,
  organization: OrganizationLoading,
  "org-handbook": HandbookAdminLoading,
  "org-handbook-editor": HandbookEditorLoading,
  template: TemplateLoading,
  templates: TemplatesLoading,
  reports: ReportsLoading,
  settings: SettingsLoading,
  "track-reports": TrackReportsLoading,
};

export default async function SkeletonPreviewPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  const Loader = LOADERS[name];
  if (!Loader) notFound();
  return <Loader />;
}
