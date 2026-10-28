import { Skeleton } from "@/components/ui/skeleton";
import {
  FieldSkeleton,
  PageHeaderSkeleton,
  SettingsSectionSkeleton,
  SkeletonLine,
} from "@/components/shared/skeletons";

const sub = "text-[13px] font-semibold";

export default function OrganizationLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Organization" />

      <SettingsSectionSkeleton
        title="Identity"
        description="How your organization appears in Dossier."
      >
        <FieldSkeleton label="Organization name" />
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Schedule"
        description="When reports are due and which days count as working days."
      >
        <FieldSkeleton label="Time zone" control="w-full max-w-md" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium">Working days</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-12 rounded-lg" />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Reports are expected on these days.
          </p>
        </div>
        <FieldSkeleton label="Report deadline" control="w-36" hint />
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Attendance"
        description="Shift times, the grace period and fines used when attendance is marked."
      >
        <div className="flex flex-col gap-4">
          <h3 className={sub}>Grace period and leave</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton
              label="Grace period (minutes)"
              hint="Minutes after shift start before lateness is recorded."
            />
            <FieldSkeleton
              label="Informed leaves per month"
              hint="Beyond this, absences count as uninformed."
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-edge pt-5">
          <h3 className={sub}>Fines (PKR)</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSkeleton label="Late" hint="After the grace period." />
            <FieldSkeleton label="Very late" hint="Significantly late arrival." />
            <FieldSkeleton label="Uninformed absence" hint="No advance notice given." />
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-edge pt-5">
          <h3 className={sub}>Shifts</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSkeleton
              label="Full-time start"
              hint="The grace period counts from here."
            />
            <FieldSkeleton label="Part-time morning" />
            <FieldSkeleton label="Part-time evening" />
          </div>
        </div>
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Report templates"
        description="The questions people answer each day. Assign templates to departments or to individual people."
        saveBar={false}
        aside={<Skeleton className="h-8 w-32 rounded-lg" />}
      >
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl ring-1 ring-inset ring-edge">
            {["w-32", "w-40"].map((width) => (
              <li
                key={width}
                className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5"
              >
                <SkeletonLine className={width} />
                <Skeleton className="h-3 w-20" />
              </li>
            ))}
          </ul>
          <span className="text-[13px] text-muted-foreground">Manage all templates</span>
        </div>
      </SettingsSectionSkeleton>

      <SettingsSectionSkeleton
        title="Handbook"
        description="Policies, SOPs, job descriptions and guides. Choose who can see each one and who must confirm they've read it."
        saveBar={false}
        aside={<Skeleton className="h-8 w-32 rounded-lg" />}
      >
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl ring-1 ring-inset ring-edge">
            {["w-36", "w-28", "w-44"].map((width) => (
              <li
                key={width}
                className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5"
              >
                <SkeletonLine className={width} />
                <Skeleton className="h-5 w-20 rounded-full" />
              </li>
            ))}
          </ul>
          <span className="text-[13px] text-muted-foreground">Manage the handbook</span>
        </div>
      </SettingsSectionSkeleton>
    </div>
  );
}
