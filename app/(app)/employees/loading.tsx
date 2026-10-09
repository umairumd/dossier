import { Skeleton } from "@/components/ui/skeleton";
import {
  DataListSkeleton,
  PageHeaderSkeleton,
  ToolbarSkeleton,
} from "@/components/shared/skeletons";

export default function EmployeesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Employees" action="button" actionClassName="w-[152px]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <div className="flex flex-col gap-4">
          <ToolbarSkeleton filter="w-[272px]" />
          <DataListSkeleton
            columns="minmax(0,1.3fr) minmax(0,1fr) 5.5rem 6.5rem 2rem"
            header={["Person", "Department", "Role", "Last seen", ""]}
            rows={8}
            cells={["text", "text", "text", "action"]}
          />
        </div>
      </div>
    </div>
  );
}
