import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Identity card */}
      <Skeleton className="h-32 w-full rounded-xl" />
      {/* Schedule card */}
      <Skeleton className="h-40 w-full rounded-xl" />
      {/* Templates card */}
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
