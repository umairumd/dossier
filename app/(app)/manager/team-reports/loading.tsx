import { Skeleton } from "@/components/ui/skeleton";

export default function TeamReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader: title + date nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div>
        {/* Section label */}
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="flex flex-col gap-4">
          {/* Search + filter */}
          <div className="flex gap-3">
            <Skeleton className="h-9 min-w-0 flex-1" />
            <Skeleton className="h-9 w-40" />
          </div>
          {/* Rows */}
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
