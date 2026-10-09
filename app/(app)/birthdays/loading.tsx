import {
  GroupHeadingSkeleton,
  PageHeaderSkeleton,
  PersonCardGridSkeleton,
} from "@/components/shared/skeletons";

const GRID = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

export default function BirthdaysLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Birthdays" />
      <div className="flex flex-col gap-8">
        <section>
          <GroupHeadingSkeleton />
          <PersonCardGridSkeleton count={3} footer="line" className={GRID} />
        </section>
        <section>
          <GroupHeadingSkeleton className="w-20" />
          <PersonCardGridSkeleton count={2} footer="line" className={GRID} />
        </section>
      </div>
    </div>
  );
}
