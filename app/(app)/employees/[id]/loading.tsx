import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
