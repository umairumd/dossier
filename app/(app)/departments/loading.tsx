import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <Skeleton className="h-9 min-w-0 flex-1" />
        <Skeleton className="h-9 w-44" />
      </div>

      {/* Department rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="size-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
