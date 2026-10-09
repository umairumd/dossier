import { Skeleton } from "@/components/ui/skeleton";
import {
  CardSkeleton,
  PageHeaderSkeleton,
  ReportHistorySkeleton,
  TodayReportSkeleton,
} from "@/components/shared/skeletons";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="My Reports" description={false} />
      <TodayReportSkeleton />
      <CardSkeleton label="Report history" contentClassName="flex flex-col gap-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <ReportHistorySkeleton rows={6} />
      </CardSkeleton>
    </div>
  );
}
