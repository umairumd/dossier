import { Skeleton } from "@/components/ui/skeleton";
import { ActivityRowsSkeleton, CardSkeleton } from "@/components/shared/skeletons";

// Filters and the feed card, shown while the first page of activity loads.
export function ActivityListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full rounded-lg sm:flex-1" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="h-9 rounded-lg sm:w-44" />
          <Skeleton className="h-9 rounded-lg sm:w-44" />
        </div>
      </div>
      <CardSkeleton label="All activity">
        <ActivityRowsSkeleton groups={[2, 2, 6]} />
      </CardSkeleton>
    </div>
  );
}
