import { PageHeaderSkeleton, SkeletonLine } from "@/components/shared/skeletons";
import { ActivityListSkeleton } from "./activity-list-skeleton";

export default function ActivityLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeaderSkeleton title="Activity" description={false} />
        <div className="mt-4">
          <SkeletonLine className="w-64" />
        </div>
      </div>
      <ActivityListSkeleton />
    </div>
  );
}
