import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
      </div>
      {/* ReportBanner */}
      <Skeleton className="h-16 w-full rounded-xl" />
      {/* Report history card */}
      <div className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
