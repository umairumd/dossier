import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Home: one row to the handbook, where Who to ask lives. */
export function HandbookLinkRow() {
  return (
    <Card className="rise-in py-0">
      <Link
        href="/handbook"
        className="group/footer flex h-12 w-full items-center justify-between px-(--card-spacing) text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-fill-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        Who to ask and your handbook
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-hover/footer:translate-x-0.5"
        />
      </Link>
    </Card>
  );
}
