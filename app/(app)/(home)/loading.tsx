import { LeaveBalanceCardSkeleton } from "@/components/attendance/skeletons";
import {
  HomeActivitySkeleton,
  HomeChartSkeleton,
  HomeHeroSkeleton,
  HomeListCardSkeleton,
  LoadingNote,
} from "@/components/shared/skeletons";

// Shown only until the viewer's role is known. After that the dashboard
// renders and each card streams in behind its own skeleton
// (components/dashboard/home-sections). Shapes follow the manager and admin
// layout; the employee home has the same frame with one tile instead of two.
export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading home" />
      <HomeHeroSkeleton />
      <LeaveBalanceCardSkeleton />
      <HomeChartSkeleton />
      <HomeListCardSkeleton />
      <HomeActivitySkeleton />
    </div>
  );
}
