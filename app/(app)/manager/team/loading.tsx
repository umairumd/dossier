import { Skeleton } from "@/components/ui/skeleton";

export default function TeamMembersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
