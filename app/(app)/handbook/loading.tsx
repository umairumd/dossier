import {
  CardRowsSkeleton,
  CardSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function HandbookLoading() {
  const [profile, settings] = await Promise.all([getCurrentProfile(), getOrganizationSettings()]);
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  // Before launch, everyone but owners and admins gets the Coming soon card.
  if (!isAdmin && !settings.handbookLaunchedAt) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeaderSkeleton title="Handbook" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Handbook"
        action={isAdmin ? "button" : undefined}
        actionClassName="w-28"
      />
      {isAdmin && !settings.handbookLaunchedAt ? (
        <Skeleton className="h-[60px] w-full rounded-xl" />
      ) : null}
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <CardSkeleton label="Start here" aside="3 of 5 read" contentClassName="flex flex-col gap-3">
            <Skeleton className="h-1 w-full rounded-full" />
            <CardRowsSkeleton rows={3} lead="icon" trailing />
          </CardSkeleton>
          <CardSkeleton label="Your role">
            <CardRowsSkeleton rows={1} lead="icon" />
          </CardSkeleton>
          <div className="flex flex-col gap-3">
            <h2 className="card-title">Company policies</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-36 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <CardSkeleton label="Who to ask">
          <CardRowsSkeleton rows={3} lead="person" />
        </CardSkeleton>
      </div>
    </div>
  );
}
