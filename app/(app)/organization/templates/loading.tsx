import {
  DataListSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";

export default function TemplatesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Report templates" action="button" />
      <DataListSkeleton
        columns="minmax(0,1fr) 7rem 2rem"
        header={["Template", "Questions", ""]}
        rows={4}
        lead="mobile-sub"
        cells={["text", "action"]}
      />
    </div>
  );
}
