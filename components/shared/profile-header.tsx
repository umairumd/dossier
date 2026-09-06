"use client";

import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";
import type { BotExpression } from "@/components/shared/bot-avatar";

const outlinedPillClassName =
  "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground";

const filledPillClassName =
  "inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background";

export function ProfileHeader({
  userId,
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatarUrl,
  size = "md",
  avatarSize = "lg",
  roleLabel,
  joinedLabel,
  expression,
}: {
  userId?: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatarUrl?: string | null;
  size?: "sm" | "md";
  avatarSize?: "md" | "lg" | "xl" | "2xl";
  roleLabel?: string;
  joinedLabel?: string;
  expression?: BotExpression;
}) {
  const showDetailPills = Boolean(roleLabel);

  return (
    <div className="flex w-full items-center gap-4 py-2">
      <div className="relative">
        <MemberAvatar
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? undefined}
          size={avatarSize}
          expression={expression}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <h2
            className={cn(
              "font-semibold",
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
          <div className="flex flex-wrap items-center gap-2">
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
              <p className="text-sm text-muted-foreground">{designation}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
