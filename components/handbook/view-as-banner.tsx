import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown while an owner or admin views the handbook as someone else. */
export function HandbookViewAsBanner({
  name,
  details,
  stopHref,
}: {
  name: string;
  details: string;
  stopHref: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl bg-leave/8 px-4 py-3 ring-1 ring-inset ring-leave/30 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm">
        <Eye aria-hidden className="mt-0.5 size-4 shrink-0 text-leave" />
        <span>
          <span className="font-medium">Viewing as {name}</span>
          {details ? <span className="text-muted-foreground"> · {details}</span> : null}
          <span className="text-muted-foreground">. This is what they see, as if launched.</span>
        </span>
      </p>
      <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
        <Link href={stopHref}>Stop viewing</Link>
      </Button>
    </div>
  );
}
