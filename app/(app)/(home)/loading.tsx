import { Skeleton } from "@/components/ui/skeleton";

// Role-neutral dashboard skeleton: every role's dashboard opens with the
// hero card and the report banner, followed by content cards.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* DashboardHero */}
      <div className="flex flex-col gap-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>
      </div>
      {/* Report banner */}
      <Skeleton className="h-16 w-full rounded-xl" />
      {/* Content cards */}
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
