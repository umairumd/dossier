"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvitationActionsMenu } from "@/components/admin/invitation-actions-menu";
import { Badge } from "@/components/ui/badge";
import { LocalDateTime } from "@/components/shared/local-datetime";
import type { EmployeeListItem } from "@/types/employee";

type StatusFilter = "all" | "invited" | "pending";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invited", label: "Pending" },
  { value: "pending", label: "Expired" },
];

export function InvitationList({
  invitations,
}: {
  invitations: EmployeeListItem[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? invitations
        : invitations.filter((inv) => inv.status === statusFilter);

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return byStatus;
    }

    return byStatus.filter(
      (inv) =>
        inv.full_name.toLowerCase().includes(normalized) ||
        inv.email?.toLowerCase().includes(normalized)
    );
  }, [invitations, query, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invitations..."
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {invitations.length === 0
            ? "No pending invitations."
            : "No invitations match your filters."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invitation) => {
              const dateToShow =
                invitation.invited_at ?? invitation.created_at;

              return (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invitation.email ?? "—"}
                </TableCell>
                <TableCell>
                  {invitation.status === "pending" ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dateToShow ? (
                    <LocalDateTime isoString={dateToShow} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {invitation.email && (
                    <InvitationActionsMenu
                      email={invitation.email}
                      fullName={invitation.full_name}
                    />
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
