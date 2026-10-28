import { LoadingNote, SkeletonLine } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"];

export default function HandbookDocLoading() {
  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
      <LoadingNote label="Loading document" />
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <SkeletonLine size="13" className="w-28" />
          </div>
          <SkeletonLine size="2xl" className="w-72" />
          <SkeletonLine className="w-96 max-w-full" />
          <SkeletonLine size="13" className="w-64" />
        </div>
        <div className="flex max-w-[72ch] flex-col gap-2">
          <SkeletonLine size="base" className="w-40" />
          {LINES.map((width, index) => (
            <SkeletonLine key={index} className={width} />
          ))}
          <SkeletonLine size="base" className="mt-4 w-48" />
          {LINES.slice(0, 4).map((width, index) => (
            <SkeletonLine key={index} className={width} />
          ))}
        </div>
      </div>
      <div className="hidden flex-col gap-2 xl:flex">
        <span className="text-[13px] font-medium">On this page</span>
        {["w-32", "w-24", "w-36"].map((width) => (
          <SkeletonLine key={width} size="13" className={width} />
        ))}
      </div>
    </div>
  );
}
