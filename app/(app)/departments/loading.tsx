import { PageHeaderSkeleton, ToolbarSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Departments" action="button" actionClassName="w-[160px]" />
      <div className="flex flex-col gap-4">
        <ToolbarSkeleton filter="w-[136px]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="surface-card flex flex-col gap-4 rounded-xl bg-card p-5">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex">
                {[0, 1, 2].map((face) => (
                  <Skeleton key={face} className="-ml-1.5 size-7 rounded-full first:ml-0" />
                ))}
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
