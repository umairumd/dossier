import { Building2, Clock, FileStack, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import {
  LeaveBalanceCardSkeleton,
  PersonalCalendarSkeleton,
} from "@/components/attendance/skeletons";
import { Separator } from "@/components/ui/separator";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CardSkeleton,
  FigureStripSkeleton,
  LoadingNote,
  ReportHistorySkeleton,
  SkeletonLine,
} from "@/components/shared/skeletons";

function Assignment({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="field-label flex items-center gap-1.5 [&_svg]:size-3.5">
          {icon}
          {label}
        </p>
        {children}
      </div>
      <Skeleton className="h-7 w-12 rounded-md" />
    </div>
  );
}

function Detail({ label, width }: { label: string; width: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="field-label">{label}</p>
      <SkeletonLine className={width} />
    </div>
  );
}

// Owners and admins also get the month calendar on someone's profile.
export default async function EmployeeProfileLoading() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading profile" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-4 py-2">
          <span className="flex h-[102.5px] shrink-0 items-start">
            <Skeleton className="size-24 rounded-full" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SkeletonLine size="2xl" className="w-56" />
            <SkeletonLine className="w-28" />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardSkeleton
            label="Assignments"
            className="h-full"
            contentClassName="flex flex-col gap-4"
          >
            <Assignment icon={<Building2 />} label="Departments">
              <Skeleton className="h-[22px] w-24 rounded-full" />
            </Assignment>
            <Separator />
            <Assignment icon={<UserCheck />} label="Reports to">
              <SkeletonLine className="w-28" />
            </Assignment>
            <Separator />
            <Assignment icon={<FileStack />} label="Report template">
              <div className="flex flex-col gap-1">
                <SkeletonLine className="w-32" />
                <SkeletonLine size="xs" className="w-20" />
              </div>
            </Assignment>
            <Separator />
            <Assignment icon={<Clock />} label="Shift">
              <div className="flex flex-col gap-1">
                <SkeletonLine className="w-20" />
                <SkeletonLine size="xs" className="w-28" />
              </div>
            </Assignment>
          </CardSkeleton>
        </div>
        <div className="lg:col-span-1">
          <CardSkeleton
            label="Details"
            className="h-full"
            contentClassName="flex flex-col gap-3"
          >
            <Detail label="Email" width="w-44" />
            <Detail label="Role" width="w-16" />
            <Detail label="Employment" width="w-20" />
            <Detail label="Work location" width="w-16" />
            <Detail label="Member since" width="w-24" />
            <Detail label="Last seen" width="w-24" />
          </CardSkeleton>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <FigureStripSkeleton
          labels={["Current streak", "Submission rate", "Last report"]}
          hints
        />
        <LeaveBalanceCardSkeleton />
        {isAdmin ? (
          <PersonalCalendarSkeleton title="Attendance" />
        ) : null}
      </div>

      <CardSkeleton label="Report history">
        <ReportHistorySkeleton rows={5} />
      </CardSkeleton>
    </div>
  );
}
