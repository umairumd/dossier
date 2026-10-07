"use client";

import { Pencil } from "lucide-react";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { RoleChip } from "@/components/shared/role-chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filledPillClassName =
  "inline-flex max-w-full items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background";

export function ProfileHeader({
  userId,
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatar,
  avatarSize = "lg",
  roleLabel,
  joinedLabel,
  interactive,
  onCustomise,
}: {
  userId?: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatar?: unknown;
  avatarSize?: "md" | "lg" | "xl" | "2xl";
  roleLabel?: string;
  joinedLabel?: string;
  interactive?: boolean;
  /** Settings only: the avatar opens Customise buddy. */
  onCustomise?: () => void;
}) {
  const showDetailPills = Boolean(roleLabel);
  const avatarNode = (
    <MemberAvatar
      userId={userId}
      name={name}
      avatar={avatar}
      size={avatarSize}
      interactive={interactive}
    />
  );

  return (
    <div className="flex w-full items-center gap-4 py-2">
      {onCustomise ? (
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={onCustomise}
            aria-label="Customise buddy"
            className="relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {avatarNode}
            <span
              aria-hidden
              className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-foreground/15"
            >
              <Pencil className="size-2.5" />
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onCustomise}
          >
            Customise
          </Button>
        </div>
      ) : (
        <div className="relative shrink-0">{avatarNode}</div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2
            className={cn(
              "min-w-0 truncate font-semibold tracking-tight",
              showDetailPills ? "text-lg" : "text-2xl",
            )}
          >
            {name}
          </h2>
          {showDetailPills && roleLabel && <RoleChip label={roleLabel} />}
          {!showDetailPills && isRemote && <RemoteIndicator />}
          {!showDetailPills && employmentType === "part_time" && (
            <PartTimeIndicator />
          )}
        </div>
        {showDetailPills ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {designation && (
              <span className={filledPillClassName}>{designation}</span>
            )}
            {departmentNames?.map((department) => (
              <span key={department} className={filledPillClassName}>
                {department}
              </span>
            ))}
            {employmentType && (
              <span className={filledPillClassName}>
                {employmentType === "part_time" ? "Part-time" : "Full-time"}
              </span>
            )}
            {joinedLabel && (
              <span className="ml-auto text-xs text-muted-foreground">
                {joinedLabel}
              </span>
            )}
          </div>
        ) : (
          <>
            {designation && (
              <p className="truncate text-sm text-muted-foreground">
                {designation}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
