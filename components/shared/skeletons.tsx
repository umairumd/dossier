import type { ReactNode } from "react";
import { DataList, DataListRow, DataListSection } from "@/components/shared/data-list";
import { FigureStrip } from "@/components/shared/figure-strip";
import { SettingsSection } from "@/components/shared/settings-section";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { Tile } from "@/components/ui/tile";
import { Skeleton } from "@/components/ui/skeleton";
import { SHORTCUT_BODY, SHORTCUT_CARD, SHORTCUT_GRID } from "@/components/dashboard/shortcut-styles";
import { cn } from "@/lib/utils";

// Loading shapes built from the real containers (PageHeader, DataList, Card,
// SettingsSection, FigureStrip), so a page keeps its frame while it loads and
// nothing moves when the content arrives. Page titles and column headers are
// shown as is; card and tile titles, their notes and footer links are bars
// sized to the text they stand in for, so a loading card reads as loading.

const WIDTHS = ["w-36", "w-28", "w-44", "w-32", "w-24", "w-40", "w-30", "w-36"];
const SUB_WIDTHS = ["w-24", "w-20", "w-28", "w-16", "w-24", "w-20", "w-28", "w-16"];

/** One line of text at a given text size: the line box with a bar inside. */
export function SkeletonLine({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "xs" | "13" | "sm" | "base" | "xl" | "2xl";
}) {
  const box = {
    xs: "h-4",
    "13": "h-[19.5px]",
    sm: "h-5",
    base: "h-6",
    xl: "h-7",
    "2xl": "h-8",
  }[size];
  const bar = {
    xs: "h-2.5",
    "13": "h-3",
    sm: "h-3",
    base: "h-3.5",
    xl: "h-5",
    "2xl": "h-6",
  }[size];
  return (
    <span aria-hidden className={cn("flex items-center", box)}>
      <Skeleton className={cn(bar, "w-24", className)} />
    </span>
  );
}

/**
 * A bar the rough width of a piece of text, for titles and short labels.
 * A span, so it can sit inside a heading.
 */
export function TextSkeleton({ text, className }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="skeleton"
      className={cn("skeleton inline-block h-3 rounded-md align-middle", className)}
      style={{ width: `${Math.max(3, Math.round(text.length * 0.55 * 10) / 10)}em` }}
    />
  );
}

/** Text placeholder: a string becomes a bar, anything else renders as is. */
function asBar(node: ReactNode, className?: string): ReactNode {
  return typeof node === "string" ? <TextSkeleton text={node} className={className} /> : node;
}

/** Screen-reader note for a loading region. */
export function LoadingNote({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

// ── Page header ───────────────────────────────────────────────────────

export function PageHeaderSkeleton({
  title,
  description = true,
  action,
  actionClassName,
  descriptionPlacement = "inline",
}: {
  title: string;
  description?: boolean;
  /** "button" (h-9 button), "nav" (date or month control) or a node. */
  action?: "button" | "nav" | ReactNode;
  /** Width of the "button" / "nav" placeholder. */
  actionClassName?: string;
  /** "below": the description is PageHeader children (mt-4), as on Activity. */
  descriptionPlacement?: "inline" | "below";
}) {
  if (descriptionPlacement === "below") {
    return (
      <div>
        <LoadingNote label={`Loading ${title}`} />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4">
          <SkeletonLine className="w-80" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <LoadingNote label={`Loading ${title}`} />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <SkeletonLine className="w-48" /> : null}
      </div>
      {action ? (
        <div className="shrink-0">
          {action === "button" ? (
            <Skeleton className={cn("h-9 w-32 rounded-lg", actionClassName)} />
          ) : action === "nav" ? (
            <Skeleton className={cn("h-9 w-52 rounded-lg", actionClassName)} />
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Search box and segmented filter above a list. */
export function ToolbarSkeleton({ filter = "w-64" }: { filter?: string | false }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Skeleton className="h-9 min-w-0 flex-1 rounded-lg" />
      {filter ? <Skeleton className={cn("h-9 rounded-lg", filter)} /> : null}
    </div>
  );
}

// ── Lists ─────────────────────────────────────────────────────────────

export type SkeletonCell =
  | "text"
  | "badge"
  | "person"
  | "action"
  | "chevron"
  | "empty";

/** person/tile: avatar or date tile and two lines; text: two lines;
 *  mobile-sub: one line with a second on phones only; single: one line. */
type LeadKind = "person" | "tile" | "text" | "single" | "mobile-sub";

function LeadCell({
  kind,
  index,
}: {
  kind: LeadKind;
  index: number;
}) {
  const main = WIDTHS[index % WIDTHS.length];
  const sub = SUB_WIDTHS[index % SUB_WIDTHS.length];
  return (
    <span className="flex min-w-0 items-center gap-3">
      {kind === "person" ? (
        <Skeleton className="size-8 shrink-0 rounded-full" />
      ) : kind === "tile" ? (
        <Skeleton className="size-10 shrink-0 rounded-lg" />
      ) : null}
      <span className="flex min-w-0 flex-col">
        <SkeletonLine className={main} />
        {kind === "mobile-sub" ? (
          <span className="md:hidden">
            <SkeletonLine size="13" className={sub} />
          </span>
        ) : kind !== "single" ? (
          <SkeletonLine size="13" className={sub} />
        ) : null}
      </span>
    </span>
  );
}

function OtherCell({ kind, index, column }: { kind: SkeletonCell; index: number; column: number }) {
  // On phones a row keeps its lead cell, status badge and row action; the
  // other cells are desktop only (as in the real lists).
  const desktop = "hidden md:flex";
  switch (kind) {
    case "badge":
      return (
        <span className="flex items-center">
          <Skeleton className="h-5 w-16 rounded-full" />
        </span>
      );
    case "text":
      return (
        <span className={cn(desktop, "items-center")}>
          <Skeleton className={cn("h-3", SUB_WIDTHS[(index + column) % SUB_WIDTHS.length])} />
        </span>
      );
    case "person":
      return (
        <span className={cn(desktop, "items-center gap-2.5")}>
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className={cn("h-3", SUB_WIDTHS[(index + 1) % SUB_WIDTHS.length])} />
        </span>
      );
    case "action":
      return (
        <span className="flex justify-end pr-2.5">
          <Skeleton className="size-4 rounded" />
        </span>
      );
    case "chevron":
      return (
        <span className="hidden justify-end md:flex">
          <Skeleton className="size-4 rounded" />
        </span>
      );
    default:
      return <span />;
  }
}

/**
 * A DataList with skeleton rows. `cells` describes the columns after the
 * first; `lead` the first column.
 */
export function DataListSkeleton({
  columns,
  header,
  rows = 6,
  lead = "person",
  cells,
  sections,
  variant = "card",
  className,
}: {
  columns: string;
  header?: ReactNode[];
  rows?: number;
  /** "mobile-sub": one line on desktop, a second muted line on phones. */
  lead?: LeadKind;
  cells: SkeletonCell[];
  /** Section titles (rows are split between them). */
  sections?: ReactNode[];
  variant?: "card" | "bare";
  className?: string;
}) {
  const row = (index: number) => (
    <DataListRow key={index}>
      <LeadCell kind={lead} index={index} />
      {cells.map((kind, column) => (
        <OtherCell key={column} kind={kind} index={index} column={column + 1} />
      ))}
    </DataListRow>
  );

  if (sections && sections.length > 0) {
    const per = Math.max(1, Math.ceil(rows / sections.length));
    return (
      <DataList columns={columns} header={header} variant={variant} className={className}>
        {sections.map((title, sectionIndex) => (
          <SectionRows key={sectionIndex} title={title}>
            {Array.from({ length: per }, (_, i) => row(sectionIndex * per + i))}
          </SectionRows>
        ))}
      </DataList>
    );
  }

  return (
    <DataList columns={columns} header={header} variant={variant} className={className}>
      {Array.from({ length: rows }, (_, i) => row(i))}
    </DataList>
  );
}

function SectionRows({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <>
      <DataListSection title={title} />
      {children}
    </>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────

/** A Card with its label header; children are the skeleton body. */
export function CardSkeleton({
  label,
  aside,
  children,
  className,
  contentClassName,
}: {
  label: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardTitleHeader title={asBar(label)} aside={asBar(aside, "h-2.5")} />
      {children ? <CardContent className={contentClassName}>{children}</CardContent> : null}
    </Card>
  );
}

/** Rows of a list inside a card (activity, recent reports). */
export function CardRowsSkeleton({
  rows = 5,
  lead = "person",
  trailing = true,
}: {
  rows?: number;
  lead?: "person" | "tile" | "icon";
  trailing?: boolean;
}) {
  return (
    <ul className="-mx-(--card-spacing) flex flex-col divide-y divide-line">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex min-h-14 items-center gap-3 px-(--card-spacing) py-2.5"
        >
          {lead === "person" ? (
            <Skeleton className="size-8 shrink-0 rounded-full" />
          ) : lead === "tile" ? (
            <Skeleton className="size-10 shrink-0 rounded-lg" />
          ) : (
            <Skeleton className="size-8 shrink-0 rounded-lg" />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <SkeletonLine className={WIDTHS[index % WIDTHS.length]} />
            <SkeletonLine size="13" className={SUB_WIDTHS[index % SUB_WIDTHS.length]} />
          </span>
          {trailing ? <Skeleton className="h-3 w-12 shrink-0" /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Key figures with their real labels. */
export function FigureStripSkeleton({
  labels,
  hints = false,
  variant = "card",
  className,
}: {
  labels: string[];
  hints?: boolean;
  variant?: "card" | "inset";
  className?: string;
}) {
  return (
    <FigureStrip
      variant={variant}
      className={className}
      figures={labels.map((label) => ({
        label,
        value: <Skeleton className="inline-block h-6 w-16 align-middle" />,
        hint: hints ? <Skeleton className="inline-block h-2.5 w-24 align-middle" /> : undefined,
      }))}
    />
  );
}

// ── Forms ─────────────────────────────────────────────────────────────

export function FieldSkeleton({
  label,
  wide = true,
  hint = false,
  control,
}: {
  label?: string;
  wide?: boolean;
  /** true for a hint skeleton, or the hint's own text when it is static. */
  hint?: boolean | string;
  /** Control width class (defaults to full width). */
  control?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label ? (
        <span className="text-[13px] font-medium">{label}</span>
      ) : (
        <SkeletonLine size="13" className="w-20" />
      )}
      <Skeleton
        className={cn("h-9 rounded-lg", control ?? (wide ? "w-full" : "w-full sm:max-w-56"))}
      />
      {typeof hint === "string" ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : hint ? (
        <SkeletonLine size="xs" className="w-48" />
      ) : null}
    </div>
  );
}

/** A SettingsSection with its real title and description, fields loading. */
export function SettingsSectionSkeleton({
  title,
  description,
  fields = [],
  grid = false,
  saveBar = true,
  aside,
  children,
}: {
  aside?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Field labels; an empty string shows a label skeleton. */
  fields?: string[];
  /** Lay fields out two per row from sm up. */
  grid?: boolean;
  saveBar?: boolean;
  children?: ReactNode;
}) {
  return (
    <SettingsSection
      title={title}
      description={description}
      aside={aside}
      footer={
        saveBar ? (
          <div className="flex items-center justify-end gap-2 border-t border-edge bg-fill-subtle px-5 py-3 md:px-6">
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        ) : undefined
      }
    >
      {fields.length > 0 ? (
        <div className={cn("grid gap-5", grid && "sm:grid-cols-2 sm:gap-4")}>
          {fields.map((label, index) => (
            <FieldSkeleton key={index} label={label || undefined} />
          ))}
        </div>
      ) : null}
      {children}
    </SettingsSection>
  );
}

// ── People cards ──────────────────────────────────────────────────────

export function PersonCardSkeleton({
  footer = "stats",
  meta = false,
}: {
  footer?: "stats" | "line" | "none";
  /** A third, smaller line under the designation. */
  meta?: boolean;
}) {
  return (
    <div className="surface-card flex h-full flex-col items-center gap-3 rounded-xl bg-card px-4 pt-5 pb-4">
      <Skeleton className="size-14 rounded-full" />
      <span className="flex w-full flex-col items-center gap-0.5">
        <span className="flex h-[22.5px] items-center">
          <Skeleton className="h-3.5 w-28" />
        </span>
        <span className="flex h-5 items-center">
          <Skeleton className="h-3 w-20" />
        </span>
        {meta ? (
          <span className="flex h-4 items-center">
            <Skeleton className="h-2.5 w-24" />
          </span>
        ) : null}
      </span>
      {footer !== "none" ? (
        <span className="mt-auto flex w-full border-t border-edge pt-3">
          {footer === "stats" ? (
            <span className="grid w-full grid-cols-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-1",
                    i > 0 && "border-l border-edge",
                  )}
                >
                  <span className="flex h-[22.5px] items-center">
                    <Skeleton className="h-3.5 w-8" />
                  </span>
                  <span className="flex h-[17.25px] items-center">
                    <Skeleton className="h-2.5 w-12" />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="flex h-[19.5px] w-full items-center justify-center">
              <Skeleton className="h-3 w-24" />
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}

export function PersonCardGridSkeleton({
  count = 6,
  footer = "stats",
  meta = false,
  className = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}: {
  meta?: boolean;
  count?: number;
  footer?: "stats" | "line" | "none";
  /** Grid columns, matching the page's own grid. */
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <PersonCardSkeleton key={i} footer={footer} meta={meta} />
      ))}
    </div>
  );
}

/** GroupHeading placeholder (13px label above a group of cards). */
export function GroupHeadingSkeleton({ className = "w-28" }: { className?: string }) {
  return (
    <span className="mb-3 flex h-5 items-center">
      <Skeleton className={cn("h-3", className)} />
    </span>
  );
}

/** Activity rows grouped by day (Activity page, home activity card). */
export function ActivityRowsSkeleton({ groups = [3, 4] }: { groups?: number[] }) {
  let n = 0;
  return (
    <div className="flex flex-col">
      {groups.map((count, groupIndex) => (
        <section key={groupIndex}>
          <span className={cn("flex h-5 items-center pb-1", groupIndex > 0 && "mt-4")}>
            <Skeleton className="h-2.5 w-16" />
          </span>
          <ul className="flex flex-col divide-y divide-line">
            {Array.from({ length: count }, () => {
              const index = n++;
              return (
                <li key={index} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <SkeletonLine className={WIDTHS[(index + 2) % WIDTHS.length] + " max-w-full"} />
                    {index % 3 === 1 ? (
                      <SkeletonLine size="xs" className={SUB_WIDTHS[index % SUB_WIDTHS.length]} />
                    ) : null}
                  </span>
                  <Skeleton className="h-2.5 w-10 shrink-0" />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Today's report panel (My Reports, home hero) while it loads. */
export function TodayReportSkeleton() {
  return (
    <section className="flex flex-col rounded-xl border border-edge bg-fill-subtle p-4 md:p-[18px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex h-5 items-center justify-between gap-3">
              <TextSkeleton text="Today's report" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <span className="mt-2 flex h-7 items-center md:h-[34px]">
              <Skeleton className="h-6 w-28 md:h-7" />
            </span>
          </div>
          <Skeleton className="h-11 w-full rounded-lg md:h-9 md:w-32" />
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
    </section>
  );
}

/** A person's report history rows (My Reports, profiles). */
export function ReportHistorySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <DataListSkeleton
      variant="bare"
      columns="minmax(0,1fr) 7.5rem 7rem 1.25rem"
      header={["Report", "Status", "Submitted", ""]}
      rows={rows}
      lead="tile"
      cells={["badge", "text", "chevron"]}
    />
  );
}

/** CompletionLineChart while it loads (home, department detail). */
export function CompletionChartSkeleton({ title = "Company completion" }: { title?: string }) {
  return (
    <Tile>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="flex h-5 items-center">
            <TextSkeleton text={title} />
          </span>
          <span className="flex h-4 items-center">
            <TextSkeleton text="Last 30 days · working days" className="h-2.5" />
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="flex h-[30px] items-center">
            <Skeleton className="h-6 w-16" />
          </span>
        </div>
      </div>
      <div className="relative mt-3 h-40 md:h-[200px]">
        <div className="absolute inset-y-[22px] left-9 right-4 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-px w-full bg-fill-hover" />
          ))}
        </div>
        <Skeleton className="absolute bottom-7 left-9 right-4 h-1/2 rounded-md opacity-60" />
      </div>
      <span className="mt-2 flex h-[16.5px] items-center">
        <TextSkeleton text="Weekends and holidays are skipped. Includes voluntary submissions." className="h-2 max-w-full" />
      </span>
    </Tile>
  );
}

// ── Home ──────────────────────────────────────────────────────────────
// Each home card streams in on its own (components/dashboard/home-sections),
// with one of these in its place until its data arrives.

const HOME_TILE = "flex flex-col rounded-xl border border-edge bg-fill-subtle p-4 md:p-[18px]";

/** A card's footer link row with its label shown as is. */
function CardFooterSkeleton({ label }: { label?: string }) {
  return (
    <div
      data-slot="card-footer"
      className="mt-auto flex h-12 items-center justify-between border-t border-edge px-(--card-spacing) text-sm font-medium text-muted-foreground"
    >
      <TextSkeleton text={label ?? "View all"} />
    </div>
  );
}

/** The dashboard hero: buddy, greeting, figures, today's report and the tiles. */
export function HomeHeroSkeleton({ stats = 4, team = true }: { stats?: number; team?: boolean }) {
  return (
    <div className="surface-card flex flex-col gap-6 rounded-xl px-3 pt-6 pb-3 md:p-6">
      <div className="flex flex-col gap-6 px-3 md:flex-row md:px-0 md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Skeleton className="size-28 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <SkeletonLine className="w-24" />
            <SkeletonLine size="2xl" className="w-48" />
            <SkeletonLine className="w-40" />
            <SkeletonLine className="mt-1 w-56" />
          </div>
        </div>
        <div
          className="grid w-full shrink-0 gap-x-6 gap-y-4 md:w-auto"
          style={{ gridTemplateColumns: `repeat(${stats}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="flex flex-col gap-0.5 md:w-[123px]">
              <span className="flex h-5 items-center">
                <Skeleton className="h-2.5 w-16" />
              </span>
              <span className="flex h-7 items-center">
                <Skeleton className="h-5 w-14" />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <TodayReportSkeleton />
        </div>
        {Array.from({ length: team ? 2 : 1 }, (_, i) => (
          <div key={i} className={cn(HOME_TILE, "h-[338px] gap-3", !team && "md:col-span-2")}>
            <SkeletonLine size="sm" className="w-24" />
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="size-[104px] rounded-full" />
            </div>
            <SkeletonLine className="mx-auto w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The 30-day chart before its title is known (the route-level loading screen). */
export function HomeChartSkeleton() {
  return (
    <div className={cn(HOME_TILE, "h-[307px]")}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <SkeletonLine className="w-36" />
          <SkeletonLine size="xs" className="w-24" />
        </div>
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="mt-3 h-40 w-full rounded-lg md:h-[200px]" />
    </div>
  );
}

/** People rows: buddy, name and designation, a value on the right. */
function PeopleRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col">
            <SkeletonLine className={WIDTHS[i % WIDTHS.length]} />
            <SkeletonLine size="xs" className={SUB_WIDTHS[i % SUB_WIDTHS.length]} />
          </span>
          <Skeleton className="h-3 w-10 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** A list card before its title is known (the route-level loading screen). */
export function HomeListCardSkeleton() {
  return (
    <CardSkeleton label={<Skeleton className="h-3 w-28" />} className="h-[301px] pb-0" contentClassName="flex-1">
      <div className="grid h-full grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <span className="flex flex-col">
              <SkeletonLine className={i % 2 ? "w-24" : "w-32"} />
              <SkeletonLine size="xs" className="w-20" />
            </span>
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

/** Departments card on the admin home. */
export function DeptCompletionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="pb-0">
      <CardTitleHeader
        title={<TextSkeleton text="Departments" />}
        aside={
          <span className="-my-1 -mr-1">
            <Skeleton className="h-8 w-32 rounded-lg" />
          </span>
        }
      />
      <CardContent>
        <div className="-mx-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 px-2 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <SkeletonLine className={WIDTHS[i % WIDTHS.length]} />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooterSkeleton label="Track reports" />
    </Card>
  );
}

/** Longest streaks and Needs a nudge on the manager home. */
export function TeamHighlightsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CardSkeleton label="Longest streaks" aside="Consecutive days">
        <PeopleRowsSkeleton />
      </CardSkeleton>
      <CardSkeleton label="Needs a nudge" aside="Last 30 days">
        <PeopleRowsSkeleton />
      </CardSkeleton>
    </div>
  );
}

/** The member's 30-day strip. */
export function ActivityStripSkeleton() {
  return (
    <CardSkeleton label="Last 30 days" contentClassName="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 md:gap-1.5">
        {Array.from({ length: 30 }, (_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xs md:rounded-sm" />
        ))}
      </div>
      <span className="flex h-4 items-center">
        <Skeleton className="h-2.5 w-64 max-w-full" />
      </span>
    </CardSkeleton>
  );
}

/** The member's recent reports card. */
export function RecentReportsSkeleton() {
  return (
    <Card>
      <CardTitleHeader title={<TextSkeleton text="Your recent reports" />} />
      <CardContent>
        <ReportHistorySkeleton />
      </CardContent>
      <CardFooterSkeleton label="All reports" />
    </Card>
  );
}

/** The activity card at the bottom of every home. */
export function HomeActivitySkeleton({ title = "Company activity" }: { title?: string }) {
  return (
    <div className="surface-card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card pt-(--card-spacing) [--card-spacing:--spacing(5)]">
      <div className="-mb-1.5 flex min-h-7 items-center px-(--card-spacing)">
        <TextSkeleton text={title} />
      </div>
      <div className="px-(--card-spacing)">
        <ActivityRowsSkeleton groups={[2, 3]} />
      </div>
      <CardFooterSkeleton label="All activity" />
    </div>
  );
}

/** The admin shortcuts: invite, new department, new template. */
export function ShortcutGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={SHORTCUT_GRID}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={SHORTCUT_CARD}>
          <span className={SHORTCUT_BODY}>
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <span className="flex w-full min-w-0 flex-1 flex-col">
              <SkeletonLine className="w-28" />
              <SkeletonLine size="xs" className="w-36 max-w-full" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

