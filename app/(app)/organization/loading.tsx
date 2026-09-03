import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-56 max-w-md" />
    </div>
  );
}
