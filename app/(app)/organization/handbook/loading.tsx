import {
  DataListSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";

export default function HandbookAdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Handbook" action="button" />
      <DataListSkeleton
        columns="minmax(0,1fr) 8rem 11rem 6rem 5rem 2rem"
        header={["Document", "Status", "Who can see it", "Read", "Updated", ""]}
        rows={5}
        lead="mobile-sub"
        cells={["badge", "text", "text", "text", "chevron"]}
      />
    </div>
  );
}
