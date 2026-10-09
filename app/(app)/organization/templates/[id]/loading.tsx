import { Skeleton } from "@/components/ui/skeleton";
import {
  FieldSkeleton,
  LoadingNote,
  SettingsSectionSkeleton,
  SkeletonLine,
} from "@/components/shared/skeletons";

export default function TemplateEditorLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingNote label="Loading template" />
      <div className="flex min-w-0 flex-col gap-1">
        <SkeletonLine size="2xl" className="w-52" />
        <SkeletonLine className="w-28" />
      </div>

      <SettingsSectionSkeleton
        title="Details"
        description="How the template shows up when you pick one for a department."
        saveBar={false}
      >
        <FieldSkeleton label="Name" />
        <FieldSkeleton label="Description" hint="Optional." />
        <SkeletonLine className="w-52" />
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Questions"
        description="What people answer each day, in this order. Mark one to show in report lists."
        aside={<Skeleton className="h-8 w-32 rounded-lg" />}
      >
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg ring-1 ring-inset ring-edge">
          {["w-56", "w-44", "w-64", "w-40"].map((width, index) => (
            <li
              key={width}
              className="flex min-h-14 items-center gap-3 px-3 py-2.5 sm:px-4"
            >
              <Skeleton className="h-8 w-4 shrink-0 rounded" />
              <span className="w-5 shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <SkeletonLine className={width} />
                <SkeletonLine size="13" className="w-28" />
              </span>
              <Skeleton className="size-4 shrink-0 rounded" />
            </li>
          ))}
        </ul>
      </SettingsSectionSkeleton>
    </div>
  );
}
