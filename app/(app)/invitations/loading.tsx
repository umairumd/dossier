import { Skeleton } from "@/components/ui/skeleton";
import {
  DataListSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";

export default function InvitationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Invitations" action="button" actionClassName="w-[152px]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <DataListSkeleton
          columns="minmax(0,1.3fr) minmax(0,1fr) 5.5rem 9rem 2rem"
          header={["Person", "Department", "Role", "Invited", ""]}
          rows={4}
          cells={["text", "text", "text", "action"]}
        />
      </div>
    </div>
  );
}
