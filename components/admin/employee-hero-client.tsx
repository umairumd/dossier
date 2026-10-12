import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { ExportRecordDialog } from "@/components/admin/export-record-dialog";
import { ProfileHeader } from "@/components/shared/profile-header";
import type { DepartmentOption } from "@/types/department";
import type { EmployeeListItem } from "@/types/employee";
import type { ReportTemplate } from "@/types/template";

export function EmployeeHeroClient({
  name,
  designation,
  isRemote,
  employmentType,
  avatar,
  employee,
  isSelf,
  departments,
  candidates,
  templates,
  currentTemplateSource,
  currentTemplateSourceName,
  exportRecord,
}: {
  name: string;
  designation?: string | null;
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatar?: unknown;
  employee: EmployeeListItem;
  isSelf: boolean;
  departments: DepartmentOption[];
  candidates: EmployeeListItem[];
  templates: ReportTemplate[];
  currentTemplateSource: "individual" | "department" | "default" | "none";
  currentTemplateSourceName: string | null;
  /** Owners and admins: the Export record button (join date and org today). */
  exportRecord?: { joinedOn: string; today: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <ProfileHeader
          userId={employee.id}
          name={name}
          designation={designation}
          isRemote={isRemote}
          employmentType={employmentType}
          avatar={avatar}
          avatarSize="2xl"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {exportRecord && (
          <ExportRecordDialog
            employeeId={employee.id}
            name={name}
            designation={designation}
            avatar={avatar}
            joinedOn={exportRecord.joinedOn}
            today={exportRecord.today}
          />
        )}
        <EmployeeActionsMenu
          employee={employee}
          isSelf={isSelf}
          departments={departments}
          candidates={candidates}
          redirectOnDelete="/employees"
          templates={templates}
          currentTemplateSource={currentTemplateSource}
          currentTemplateSourceName={currentTemplateSourceName}
          hideAssignments={true}
          separateEditButton
        />
      </div>
    </div>
  );
}
