"use client";

import { useState } from "react";
import { FileStack, MoreHorizontal } from "lucide-react";
import { EmployeeNameLink } from "@/components/manager/employee-name-link";
import { AssignTemplateDialog } from "@/components/admin/assign-template-dialog";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  ManagerIndicator,
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TeamRosterMember } from "@/lib/supabase/queries/manager/team";
import type { ReportTemplate } from "@/types/template";

export function TeamMemberRow({
  member,
  managerId,
  templates,
}: {
  member: TeamRosterMember;
  managerId: string | null;
  templates: ReportTemplate[];
}) {
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <li className="flex items-center py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <MemberAvatar userId={member.id} name={member.full_name} size="sm" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <EmployeeNameLink
              employeeId={member.id}
              fullName={member.full_name}
              className="text-sm font-medium hover:underline"
            />
            {managerId === member.id && <ManagerIndicator />}
            {member.is_remote && <RemoteIndicator />}
            {member.employment_type === "part_time" && <PartTimeIndicator />}
          </div>
          {member.designation && (
            <span className="truncate text-xs text-muted-foreground">
              {member.designation}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setAssignOpen(true)}>
            <FileStack className="size-4" />
            Assign Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AssignTemplateDialog
        profileId={member.id}
        personName={member.full_name}
        currentTemplateId={member.template_id}
        templates={templates}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </li>
  );
}
