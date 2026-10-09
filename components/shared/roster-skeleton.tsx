import { Skeleton } from "@/components/ui/skeleton";
import {
  DataListSkeleton,
  PageHeaderSkeleton,
  ToolbarSkeleton,
} from "@/components/shared/skeletons";

// Team Reports and Track Reports: header with the date control, search and
// status filter, then the roster (grouped by department when `sections`).
export function RosterPageSkeleton({
  title,
  sections = 0,
  rows = 7,
}: {
  title: string;
  sections?: number;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title={title} action="nav" actionClassName="w-[152px]" />
      <div className="flex flex-col gap-4">
        <ToolbarSkeleton filter="w-[348px]" />
        <DataListSkeleton
          columns="minmax(0,1fr) 7.5rem 7rem 1.25rem"
          header={["Person", "Status", "Submitted", ""]}
          rows={rows}
          cells={["badge", "text", "chevron"]}
          sections={
            sections > 0
              ? Array.from({ length: sections }, (_, i) => (
                  <Skeleton key={i} className={i % 2 ? "h-3 w-24" : "h-3 w-32"} />
                ))
              : undefined
          }
        />
      </div>
    </div>
  );
}
