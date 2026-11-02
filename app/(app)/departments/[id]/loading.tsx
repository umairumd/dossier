import { Skeleton } from "@/components/ui/skeleton";
import { DataListSkeleton, LoadingNote, SkeletonLine } from "@/components/shared/skeletons";

export default function DepartmentLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading department" />
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <SkeletonLine size="2xl" className="w-48" />
          <SkeletonLine className="w-56" />
        </div>
        <Skeleton className="h-9 w-16 rounded-lg" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="surface-card flex flex-col gap-2 rounded-xl bg-card px-3 py-3 sm:px-5 sm:py-4">
            <SkeletonLine size="13" className="w-24" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />

      <div className="surface-card flex flex-col gap-4 rounded-xl bg-card p-5">
        <SkeletonLine className="w-16" />
        <div className="flex flex-wrap gap-6">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <Skeleton className="size-10 rounded-full" />
              <SkeletonLine size="13" className="w-12" />
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card flex flex-col gap-3 rounded-xl bg-card p-5">
        <SkeletonLine className="w-36" />
        <Skeleton className="h-24 w-full" />
      </div>

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
