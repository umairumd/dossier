"use client";

import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";
import type { BotExpression } from "@/components/shared/bot-avatar";

const outlinedPillClassName =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground";

const filledPillClassName =
  "inline-flex max-w-full items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background";

export function ProfileHeader({
  userId,
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatarUrl,
  avatarSize = "lg",
  roleLabel,
  joinedLabel,
  expression,
  interactive,
}: {
  userId?: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatarUrl?: string | null;
  avatarSize?: "md" | "lg" | "xl" | "2xl";
  roleLabel?: string;
  joinedLabel?: string;
  expression?: BotExpression;
  interactive?: boolean;
}) {
  const showDetailPills = Boolean(roleLabel);

  return (
    <div className="flex w-full items-center gap-4 py-2">
      <div className="relative shrink-0">
        <MemberAvatar
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? undefined}
          size={avatarSize}
          interactive={interactive}
          expression={expression}
        />
      </div>

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
          {showDetailPills && roleLabel && (
            <span className={outlinedPillClassName}>{roleLabel}</span>
          )}
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
