import { Skeleton } from "@/components/ui/skeleton";

export default function TrackReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header: title + date nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Department sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
