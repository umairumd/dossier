import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* h1 + subtitle */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>
      {/* Profile card: xl avatar + name + form fields */}
      <div className="rounded-xl border border-border p-5 flex flex-col gap-6">
        <Skeleton className="h-5 w-16" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      {/* Performance card: 3 stat cards */}
      <div className="rounded-xl border border-border p-5 flex flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Security card */}
      <Skeleton className="h-40 w-full rounded-xl" />
      {/* Session card */}
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
