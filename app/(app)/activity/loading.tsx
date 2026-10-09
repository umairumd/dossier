import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityRowsSkeleton,
  CardSkeleton,
  PageHeaderSkeleton,
  SkeletonLine,
} from "@/components/shared/skeletons";

export default function ActivityLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeaderSkeleton title="Activity" description={false} />
        <div className="mt-4">
          <SkeletonLine className="w-64" />
        </div>
      </div>
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
    </div>
  );
}
