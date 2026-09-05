"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InvitationActionsMenu } from "@/components/admin/invitation-actions-menu";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import type { EmployeeListItem } from "@/types/employee";

export function InvitationList({
  invitations,
  currentUserId,
}: {
  invitations: EmployeeListItem[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return invitations;
    }

    return invitations.filter(
      (inv) =>
        inv.full_name.toLowerCase().includes(normalized) ||
        inv.email?.toLowerCase().includes(normalized),
    );
  }, [invitations, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invitations..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="invitations"
          title={
            invitations.length === 0
              ? "No pending invitations."
              : "No invitations match your search."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invitation.email ?? "—"}
                </TableCell>
                <TableCell>{getRoleLabel(invitation.role)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {invitation.department_names.join(", ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invitation.created_at ? (
                    <LocalDateTime isoString={invitation.created_at} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <InvitationActionsMenu
                    employee={invitation}
                    isSelf={invitation.id === currentUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
