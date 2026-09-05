import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/types/employee";

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  archived: "Archived",
  invited: "Invited",
  active: "Active",
  disabled: "Disabled",
};

const STATUS_VARIANTS: Record<
  EmployeeStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  archived: "outline",
  invited: "outline",
  active: "default",
  disabled: "destructive",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
