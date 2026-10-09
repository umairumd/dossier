import {
  DataListSkeleton,
  PageHeaderSkeleton,
  ToolbarSkeleton,
} from "@/components/shared/skeletons";

export default function DepartmentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Departments" action="button" actionClassName="w-[160px]" />
      <div className="flex flex-col gap-4">
        <ToolbarSkeleton filter="w-[136px]" />
        <DataListSkeleton
          columns="minmax(0,1fr) minmax(0,1fr) 6rem 2rem"
          header={["Department", "Manager", "People", ""]}
          rows={5}
          lead="mobile-sub"
          cells={["person", "text", "action"]}
        />
      </div>
    </div>
  );
}
