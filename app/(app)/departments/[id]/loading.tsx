import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title card */}
      <Skeleton className="h-24 w-full rounded-xl" />
      {/* Manager + Report Template */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* 7-day completion trend */}
      <Skeleton className="h-56 w-full rounded-xl" />
      {/* Members */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
