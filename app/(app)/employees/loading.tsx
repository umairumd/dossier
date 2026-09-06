import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeesLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Search + filter row */}
      <div className="flex gap-3">
        <Skeleton className="h-9 min-w-0 flex-1" />
        <Skeleton className="h-9 w-44" />
      </div>
      {/* Table header: Name · Designation · Department · Role · Status · Last Seen · Actions */}
      <div className="flex items-center gap-4 px-4 py-2">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16 mx-auto" />
        <Skeleton className="h-4 w-16 mx-auto" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-8" />
      </div>
      {/* Table rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-16 rounded-full mx-auto" />
            <Skeleton className="h-6 w-16 rounded-full mx-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
