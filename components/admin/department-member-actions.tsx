"use client";

import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeEmployeeFromDepartment } from "@/lib/actions/admin/departments";

export function DepartmentMemberActions({
  employeeId,
  departmentId,
  employeeName,
}: {
  employeeId: string;
  departmentId: string;
  employeeName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeEmployeeFromDepartment(
        employeeId,
        departmentId,
      );
      if (!result.success) {
        toast.error(result.error ?? "Couldn't remove member.");
        return;
      }
      toast.success(`${employeeName} removed from department.`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          disabled={isPending}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Member actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={handleRemove}
          className="text-destructive focus:text-destructive"
        >
          Remove from department
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
