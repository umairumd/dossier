"use client";

import { useBuddyDialog } from "@/components/layout/buddy-dialog";
import { ProfileHeader } from "@/components/shared/profile-header";

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
}) {
  const { open, prefetch } = useBuddyDialog();

  return (
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
      onCustomise={() => open()}
      onCustomisePrefetch={prefetch}
    />
  );
}
