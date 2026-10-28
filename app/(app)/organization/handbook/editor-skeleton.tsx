import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { LoadingNote, SkeletonLine } from "@/components/shared/skeletons";

/** Matches HandbookEditor: title block, content on the left, settings on the right. */
export function HandbookEditorSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6 pb-4">
      <LoadingNote label={label} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <SkeletonLine size="2xl" className="w-64" />
        <SkeletonLine className="w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="min-w-0">
          <CardTitleHeader
            title="Content"
            aside={
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-48 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            }
          />
          <CardContent>
            <Skeleton className="h-[34rem] rounded-lg" />
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardTitleHeader title="Type" />
            <CardContent className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-9 rounded-lg" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardTitleHeader title="Who can see this" />
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <SkeletonLine className="w-56" />
              <SkeletonLine className="w-36" />
            </CardContent>
          </Card>
          <Card>
            <CardTitleHeader title="Reading" />
            <CardContent className="flex flex-col gap-4">
              {[0, 1].map((index) => (
                <div key={index} className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <SkeletonLine className="w-40" />
                    <SkeletonLine className="w-56" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Skeleton className="h-[3.75rem] rounded-xl" />
    </div>
  );
}
