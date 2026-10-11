"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { SHORTCUT_BODY, SHORTCUT_CARD } from "@/components/dashboard/shortcut-styles";
import { cn } from "@/lib/utils";

// Compact shortcuts on the admin home: icon, title, one-line hint.
// ShortcutCard is a button (a dialog trigger, so it forwards props) and
// ShortcutLink goes to a page; both look the same. Client components: a
// dialog trigger (asChild) cannot slot onto a server-rendered element.
const SHORTCUT = cn(
  SHORTCUT_CARD,
  "surface-card-interactive outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
);

function ShortcutBody({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <span className={SHORTCUT_BODY}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fill-hover ring-1 ring-edge ring-inset">
        {icon}
      </span>
      <span className="flex w-full min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 @[15rem]:block"
      />
    </span>
  );
}

export function ShortcutCard({
  icon,
  title,
  hint,
  ...props
}: React.ComponentProps<"button"> & {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button type="button" className={SHORTCUT} {...props}>
      <ShortcutBody icon={icon} title={title} hint={hint} />
    </button>
  );
}

export function ShortcutLink({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link href={href} className={SHORTCUT}>
      <ShortcutBody icon={icon} title={title} hint={hint} />
    </Link>
  );
}
