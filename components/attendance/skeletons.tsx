import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, SkeletonLine } from "@/components/shared/skeletons";

/** Matches LeaveBalanceCard: big number, legend, 24-day bar. */
export function LeaveBalanceCardSkeleton() {
  return (
    <CardSkeleton
      label="Leave balance"
      aside={<Skeleton className="h-5 w-36 rounded-full" />}
      contentClassName="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-12" />
          <SkeletonLine className="w-28" />
          <SkeletonLine size="13" className="w-40" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:max-w-[14rem] sm:justify-end">
          <SkeletonLine size="13" className="w-24" />
          <SkeletonLine size="13" className="w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-12 gap-x-1.5">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="flex min-w-0 gap-0.5">
              <Skeleton className="h-3.5 flex-1 rounded-[3px]" />
              <Skeleton className="h-3.5 flex-1 rounded-[3px]" />
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <SkeletonLine size="xs" className="w-6" />
          <SkeletonLine size="xs" className="w-6" />
        </div>
      </div>
    </CardSkeleton>
  );
}

/** Matches PersonalMonthCalendar: compact month on the left, rate and tiles beside it. */
export function PersonalCalendarSkeleton({ title = "Your attendance" }: { title?: string }) {
  return (
    <CardSkeleton
      label={title}
      aside={<SkeletonLine size="13" className="w-16" />}
      contentClassName="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-0"
    >
      <div className="flex w-full max-w-[26rem] min-w-0 flex-col gap-1.5 justify-self-center lg:justify-self-start lg:pr-8">
        <div className="grid grid-cols-7 gap-1.5 pb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <span key={label} className="text-center text-xs text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
        {Array.from({ length: 5 }, (_, week) => (
          <div key={week} className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, day) => (
              <Skeleton key={day} className="h-11 rounded-lg sm:h-12" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Attendance rate</span>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-1 h-1.5 w-full max-w-sm rounded-full" />
          <SkeletonLine size="xs" className="w-44" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {["On time", "Late", "Absent", "Leave"].map((label) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-lg bg-fill-subtle px-3 py-2.5 ring-1 ring-inset ring-edge"
            >
              <span className="text-[13px] text-muted-foreground">{label}</span>
              <Skeleton className="h-5 w-6" />
            </div>
          ))}
        </div>
      </div>
    </CardSkeleton>
  );
}
