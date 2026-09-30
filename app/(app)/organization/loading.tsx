import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader (title only) */}
      <Skeleton className="h-8 w-52" />
      {/* Identity card */}
      <Skeleton className="h-36 w-full rounded-xl" />
      {/* Schedule card */}
      <Skeleton className="h-56 w-full rounded-xl" />
      {/* Attendance card */}
      <Skeleton className="h-72 w-full rounded-xl" />
      {/* Report templates card */}
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
