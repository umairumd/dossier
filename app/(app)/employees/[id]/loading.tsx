import { Building2, Clock, FileStack, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
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
        <p className="label-eyebrow flex items-center gap-1.5 [&_svg]:size-3.5">
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
      <p className="label-eyebrow">{label}</p>
      <SkeletonLine className={width} />
    </div>
  );
}

export default function EmployeeProfileLoading() {
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
            <Assignment icon={<UserCheck />} label="Reports To">
              <SkeletonLine className="w-28" />
            </Assignment>
            <Separator />
            <Assignment icon={<FileStack />} label="Report Template">
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
            <Detail label="Work Location" width="w-16" />
            <Detail label="Member Since" width="w-24" />
            <Detail label="Last Seen" width="w-24" />
          </CardSkeleton>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <FigureStripSkeleton
          labels={["Current streak", "Submission rate", "Last report"]}
          hints
        />
        <CardSkeleton label="Leave balance" contentClassName="flex flex-col gap-3">
          <SkeletonLine size="13" className="w-56" />
          <div className="grid grid-cols-3 overflow-hidden rounded-lg ring-1 ring-inset ring-foreground/10">
            {["Accrued", "Used", "Remaining"].map((label, index) => (
              <div
                key={label}
                className={
                  index > 0
                    ? "flex min-w-0 flex-col gap-1 border-l border-foreground/[0.06] px-3 py-3 sm:px-4"
                    : "flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-4"
                }
              >
                <span className="text-[13px] text-muted-foreground">{label}</span>
                <span className="flex h-8 items-center">
                  <Skeleton className="h-6 w-10" />
                </span>
              </div>
            ))}
          </div>
        </CardSkeleton>
      </div>

      <CardSkeleton label="Report history">
        <ReportHistorySkeleton rows={5} />
      </CardSkeleton>
    </div>
  );
}
