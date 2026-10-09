import { Badge } from "@/components/ui/badge";

export function DepartmentStatusBadge({
  archivedAt,
}: {
  archivedAt: string | null;
}) {
  return archivedAt ? (
    <Badge variant="neutral">Archived</Badge>
  ) : (
    <Badge variant="success">Active</Badge>
  );
}
