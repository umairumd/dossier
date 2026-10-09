import {
  PageHeaderSkeleton,
  PersonCardGridSkeleton,
} from "@/components/shared/skeletons";

export default function TeamMembersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Team Members" />
      <PersonCardGridSkeleton count={6} meta />
    </div>
  );
}
