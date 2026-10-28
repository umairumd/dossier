import { Badge } from "@/components/ui/badge";
import { HANDBOOK_KIND_TAGS } from "@/lib/handbook/format";
import type { HandbookKind } from "@/types/handbook";

const KIND_VARIANT = {
  policy: "info",
  sop: "teal",
  jd: "leave",
  guide: "warning",
} as const satisfies Record<HandbookKind, string>;

/** Policy blue, SOP teal, JD violet, Guide amber. */
export function HandbookKindTag({
  kind,
  className,
}: {
  kind: HandbookKind;
  className?: string;
}) {
  return (
    <Badge variant={KIND_VARIANT[kind]} className={className}>
      {HANDBOOK_KIND_TAGS[kind]}
    </Badge>
  );
}
