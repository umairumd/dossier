"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// Compact shortcuts on the admin home: icon, title, one-line hint.
// ShortcutCard is a button (a dialog trigger, so it forwards props) and
// ShortcutLink goes to a page; both look the same. Client components: a
// dialog trigger (asChild) cannot slot onto a server-rendered element.
const SHORTCUT =
  "surface-card surface-card-interactive group flex w-full items-center gap-3.5 rounded-xl bg-card px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function ShortcutBody({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fill-hover ring-1 ring-edge ring-inset">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </>
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
