"use client";

import { useMemo, useState } from "react";
import { DataList, DataListRow, PersonCell } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { InvitationActionsMenu } from "@/components/admin/invitation-actions-menu";
import { LocalDateTime } from "@/components/shared/local-datetime";
import { FilterSearchInput } from "@/components/shared/filter-toolbar";
import type { EmployeeListItem } from "@/types/employee";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

const COLUMNS = "minmax(0,1.3fr) minmax(0,1fr) 5.5rem 9rem 2rem";

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
      <FilterSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search invitations…"
      />

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
        <DataList
          columns={COLUMNS}
          header={["Person", "Department", "Role", "Invited", ""]}
        >
          {filtered.map((invitation) => (
            <DataListRow key={invitation.id}>
              <PersonCell
                id={invitation.id}
                name={invitation.full_name}
                avatar={invitation.avatar}
                detail={invitation.email ?? "—"}
              />
              <span className="hidden truncate text-[13.5px] text-foreground/80 md:block">
                {invitation.department_names.join(", ") || "—"}
              </span>
              <span className="hidden text-[13px] text-foreground/80 md:block">
                {ROLE_LABEL[invitation.role] ?? invitation.role}
              </span>
              <span className="hidden text-[13px] text-muted-foreground md:block">
                {invitation.created_at ? (
                  <LocalDateTime isoString={invitation.created_at} />
                ) : (
                  "—"
                )}
              </span>
              <span className="relative z-10 flex justify-end">
                <InvitationActionsMenu
                  employee={invitation}
                  isSelf={invitation.id === currentUserId}
                />
              </span>
            </DataListRow>
          ))}
        </DataList>
      )}
    </div>
  );
}
