import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero: avatar+name left, actions right */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Expression pills */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          {/* Actions menu */}
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      {/* Assignment + Details cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Report history */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
