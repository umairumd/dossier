import { Skeleton } from "@/components/ui/skeleton";
import {
  CardSkeleton,
  CompletionChartSkeleton,
  DataListSkeleton,
  LoadingNote,
  SkeletonLine,
} from "@/components/shared/skeletons";

export default function DepartmentLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading department" />
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <SkeletonLine size="2xl" className="w-48" />
          <SkeletonLine className="w-72" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardSkeleton label="Manager" aside={<Skeleton className="h-3 w-14" />}>
          <span className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <span className="flex flex-col">
              <SkeletonLine className="w-28" />
              <SkeletonLine size="13" className="w-20" />
            </span>
          </span>
        </CardSkeleton>
        <CardSkeleton label="Report template" aside={<Skeleton className="h-3 w-14" />}>
          <div className="flex flex-col gap-0.5">
            <SkeletonLine className="w-32" />
            <SkeletonLine size="13" className="w-44" />
          </div>
        </CardSkeleton>
      </div>

      <CompletionChartSkeleton title="Department completion" />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-baseline gap-1.5 text-[13px] font-semibold">Members</h2>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <DataListSkeleton
          columns="minmax(0,1fr) 7.5rem 2rem"
          header={["Person", "Today", ""]}
          rows={4}
          cells={["badge", "action"]}
        />
      </section>
    </div>
  );
}
