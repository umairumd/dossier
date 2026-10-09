import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/shared/skeletons";

// Admins see the org grid, managers their calendar and team grid, members
// their calendar. All share the header and a grid of names by days.
export default function AttendanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Attendance" action="nav" actionClassName="w-60" />
      <div className="surface-card overflow-hidden rounded-xl bg-card">
        <div className="flex h-14 items-center gap-4 border-b border-foreground/[0.08] px-4">
          <Skeleton className="h-3 w-20 shrink-0" />
          <div className="grid flex-1 grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
            {Array.from({ length: 15 }, (_, i) => (
              <Skeleton key={i} className="mx-auto h-6 w-5" />
            ))}
          </div>
        </div>
        {Array.from({ length: 7 }, (_, row) => (
          <div
            key={row}
            className="flex h-[58px] items-center gap-4 border-b border-foreground/[0.06] px-4 last:border-b-0"
          >
            <div className="flex w-[180px] shrink-0 items-center gap-2.5 sm:w-[240px]">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className={row % 2 ? "h-3 w-28" : "h-3 w-36"} />
            </div>
            <div className="hidden flex-1 grid-cols-[repeat(15,minmax(0,1fr))] gap-2 sm:grid">
              {Array.from({ length: 15 }, (_, i) => (
                <Skeleton key={i} className="mx-auto size-8 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
