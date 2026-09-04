import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="mb-0 h-4 w-32" />
      <div className="flex justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
