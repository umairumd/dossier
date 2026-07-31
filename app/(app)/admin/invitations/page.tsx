import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { formatDateTime } from "@/lib/helpers/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { EmployeeStatusBadge } from "@/components/admin/employee-status-badge";
import { InviteEmployeeSheet } from "@/components/admin/invite-employee-sheet";

export default async function InvitationsPage() {
  const [employees, departments] = await Promise.all([
    getAllEmployees(),
    getAllDepartments(),
  ]);

  const pending = employees.filter(
    (employee) => employee.status === "invited" || employee.status === "pending",
  );

  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Invitations
          </h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending {pending.length === 1 ? "invitation" : "invitations"}
          </p>
        </div>
        <InviteEmployeeSheet departments={departmentOptions} />
      </div>

      {pending.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No pending invitations — everyone has accepted or you haven&apos;t
          invited anyone yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  {employee.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.email ?? "—"}
                </TableCell>
                <TableCell>
                  <EmployeeStatusBadge status={employee.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.invited_at ? formatDateTime(employee.invited_at) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {employee.email && (
                    <CopyInviteLinkButton
                      email={employee.email}
                      fullName={employee.full_name}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
