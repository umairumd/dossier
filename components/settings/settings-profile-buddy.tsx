"use client";

import { useState } from "react";
import { CustomiseBuddyDialog } from "@/components/settings/customise-buddy-dialog";
import { ProfileHeader } from "@/components/shared/profile-header";
import type { RewardStats } from "@/lib/mascot";

export function SettingsProfileBuddy({
  userId,
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatar,
  roleLabel,
  joinedLabel,
  ownedIds,
  stats,
  timeZone,
  nowIso,
  wear,
  fromQuery,
}: {
  userId: string;
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatar: unknown;
  roleLabel?: string;
  joinedLabel?: string;
  ownedIds: string[];
  stats: RewardStats;
  timeZone: string;
  nowIso: string;
  wear?: string;
  fromQuery: boolean;
}) {
  const [open, setOpen] = useState(fromQuery);

  return (
    <>
      <ProfileHeader
        userId={userId}
        name={name}
        designation={designation}
        departmentNames={departmentNames}
        isRemote={isRemote}
        employmentType={employmentType}
        avatar={avatar}
        avatarSize="xl"
        roleLabel={roleLabel}
        joinedLabel={joinedLabel}
        onCustomise={() => setOpen(true)}
      />
      <CustomiseBuddyDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        avatar={avatar}
        ownedIds={ownedIds}
        stats={stats}
        timeZone={timeZone}
        nowIso={nowIso}
        wear={wear}
        fromQuery={fromQuery}
      />
    </>
  );
}
