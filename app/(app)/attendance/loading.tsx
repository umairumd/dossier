import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader: title + count on the left, accrual + month nav on the right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-[480px] w-full rounded-xl" />
    </div>
  );
}
