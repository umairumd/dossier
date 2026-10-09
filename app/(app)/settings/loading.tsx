import { Skeleton } from "@/components/ui/skeleton";
import {
  FieldSkeleton,
  FigureStripSkeleton,
  PageHeaderSkeleton,
  SettingsSectionSkeleton,
  SkeletonLine,
} from "@/components/shared/skeletons";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Settings" />

      <section className="surface-card rounded-xl bg-card p-5 md:p-6">
        <div className="flex w-full items-center gap-4 py-2">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="flex h-[70px] items-start">
              <Skeleton className="size-16 rounded-full" />
            </span>
            <span className="flex h-7 items-center">
              <Skeleton className="h-3 w-16" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SkeletonLine size="xl" className="w-44" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-2.5 w-24" />
            </div>
          </div>
        </div>
      </section>

      <SettingsSectionSkeleton
        title="Profile"
        description="Your name and birthday. Role and department are set by an admin."
      >
        <FieldSkeleton label="Full name" />
        <FieldSkeleton label="Email" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton label="Role" />
          <FieldSkeleton label="Department" />
        </div>
        <FieldSkeleton label="Date of birth" wide={false} hint />
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Your reporting"
        description="The last 30 days."
        saveBar={false}
      >
        <FigureStripSkeleton
          variant="inset"
          labels={["Current streak", "30-day completion", "This month"]}
        />
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Password"
        description="Choose a new password for your account. At least 8 characters."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton label="New password" />
          <FieldSkeleton label="Confirm new password" />
        </div>
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Session"
        description="Sign out of Dossier on this device."
        saveBar={false}
      >
        <Skeleton className="h-9 w-28 rounded-lg" />
      </SettingsSectionSkeleton>
    </div>
  );
}
