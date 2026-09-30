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
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invitations..."
            className="pl-8"
          />
        </div>
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
        <>
        <div className="flex flex-col gap-3 md:hidden">
          {filtered.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{invitation.full_name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {invitation.email ?? "—"}
                  </span>
                </div>
                <InvitationActionsMenu
                  employee={invitation}
                  isSelf={invitation.id === currentUserId}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-medium">
                  {getRoleLabel(invitation.role)}
                </span>
                <span>{invitation.department_names.join(", ") || "—"}</span>
                <span className="ml-auto">
                  Invited{" "}
                  {invitation.created_at ? (
                    <LocalDateTime isoString={invitation.created_at} />
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Invited</TableHead>
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
        </div>
        </>
      )}
    </div>
  );
}
