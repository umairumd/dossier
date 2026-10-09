import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityRowsSkeleton,
  CardSkeleton,
  LoadingNote,
  SkeletonLine,
} from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

// Every role's home: the hero (buddy, greeting, figures, today's report,
// progress and team tiles), the 30-day chart, a list card and activity.
// Shapes follow the manager and admin layout; the employee home has the
// same frame with one tile instead of two.

const TILE =
  "flex flex-col rounded-xl border border-edge bg-fill-subtle p-4 md:p-[18px]";

function TileSkeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn(TILE, className)}>{children}</div>;
}

function CardFooterSkeleton() {
  return (
    <div className="mt-auto flex h-12 items-center border-t border-edge px-(--card-spacing)">
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading home" />

      {/* Hero */}
      <div className="surface-card flex flex-col gap-6 rounded-xl p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <Skeleton className="size-28 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <SkeletonLine className="w-24" />
              <SkeletonLine size="2xl" className="w-48" />
              <SkeletonLine className="w-40" />
              <SkeletonLine className="mt-1 w-56" />
            </div>
          </div>
          <div className="grid w-full shrink-0 grid-cols-4 gap-x-6 gap-y-4 md:w-auto">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-0.5 md:w-[123px]">
                <span className="flex h-[16.5px] items-center">
                  <Skeleton className="h-2.5 w-16" />
                </span>
                <span className="flex h-7 items-center">
                  <Skeleton className="h-5 w-14" />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
          <TileSkeleton className="h-[113px] gap-3 md:col-span-2">
            <SkeletonLine size="xs" className="w-28" />
            <SkeletonLine className="w-64" />
            <Skeleton className="mt-auto h-9 w-36 rounded-lg" />
          </TileSkeleton>
          {[0, 1].map((i) => (
            <TileSkeleton key={i} className="h-[338px] gap-3">
              <SkeletonLine size="xs" className="w-24" />
              <div className="flex flex-1 items-center justify-center">
                <Skeleton className="size-[104px] rounded-full" />
              </div>
              <SkeletonLine className="mx-auto w-28" />
            </TileSkeleton>
          ))}
        </div>
      </div>

      {/* 30-day chart */}
      <TileSkeleton className="h-[307px]">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <SkeletonLine className="w-36" />
            <SkeletonLine size="xs" className="w-24" />
          </div>
          <Skeleton className="h-6 w-14" />
        </div>
        <Skeleton className="mt-3 h-40 w-full rounded-lg md:h-[200px]" />
      </TileSkeleton>

      {/* List card (team highlights, departments, recent reports) */}
      <CardSkeleton label={<Skeleton className="h-3 w-28" />} className="h-[301px] pb-0" contentClassName="flex-1">
        <div className="grid h-full grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <span className="flex flex-col">
                <SkeletonLine className={i % 2 ? "w-24" : "w-32"} />
                <SkeletonLine size="xs" className="w-20" />
              </span>
            </div>
          ))}
        </div>
      </CardSkeleton>

      {/* Activity */}
      <div className="surface-card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card pt-(--card-spacing) [--card-spacing:--spacing(5)]">
        <div className="-mb-1.5 flex min-h-7 items-center px-(--card-spacing)">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="px-(--card-spacing)">
          <ActivityRowsSkeleton groups={[2, 3]} />
        </div>
        <CardFooterSkeleton />
      </div>
    </div>
  );
}
