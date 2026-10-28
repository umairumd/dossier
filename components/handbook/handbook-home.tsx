"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Check, Search } from "lucide-react";
import {
  HandbookDocCard,
  HandbookDocRows,
  type HandbookListItem,
} from "@/components/handbook/doc-list";
import { HandbookKindTag } from "@/components/handbook/kind-tag";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

export interface HandbookAlert {
  id: string;
  slug: string;
  href: string;
  title: string;
  updatedOn: string;
  changeNote: string | null;
}

export interface HandbookSections {
  alerts: HandbookAlert[];
  startHere: string[];
  yourRole: string | null;
  departments: { id: string; name: string; docIds: string[] }[];
  policies: string[];
  other: string[];
}

function StartHereCard({ items }: { items: HandbookListItem[] }) {
  const done = items.filter((item) => item.status === "read").length;
  if (items.length === 0 || done === items.length) return null;

  return (
    <Card>
      <CardTitleHeader
        title="Start here"
        aside={
          <span className="tabular-nums">
            {done} of {items.length} read
          </span>
        }
      />
      <CardContent className="flex flex-col gap-3">
        <Meter value={done} max={items.length} label="Start here progress" />
        <ul className="-mx-(--card-spacing) flex flex-col divide-y divide-line">
          {items.map((item) => {
            const checked = item.status === "read";
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center gap-3 px-(--card-spacing) py-2 transition-colors outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked ? <Check aria-hidden className="size-3" /> : null}
                  </span>
                  <span className="sr-only">{checked ? "Done:" : "To read:"}</span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      checked ? "text-muted-foreground line-through decoration-foreground/30" : "font-medium",
                    )}
                  >
                    {item.title}
                  </span>
                  <HandbookKindTag kind={item.kind} />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, items }: { title: string; items: HandbookListItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardTitleHeader title={title} />
      <CardContent>
        <HandbookDocRows items={items} />
      </CardContent>
    </Card>
  );
}

export function HandbookHome({
  items,
  searchIndex,
  sections,
  aside,
  banner,
  headerAction,
  readerName,
}: {
  /** Shown above the search: launch status or "viewing as". */
  banner?: ReactNode;
  /** Right side of the page header ("View as" for owners and admins). */
  headerAction?: ReactNode;
  /** Set while an admin views as someone: "Start here" etc. read in their name. */
  readerName?: string;
  items: HandbookListItem[];
  /** Lowercased title, summary and body per doc id. */
  searchIndex: Record<string, string>;
  sections: HandbookSections;
  aside: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const pick = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((item): item is HandbookListItem => Boolean(item));

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results =
    terms.length === 0
      ? []
      : items.filter((item) => {
          const text = searchIndex[item.id] ?? "";
          return terms.every((term) => text.includes(term));
        });

  const toRead = items.filter((item) => item.status !== "read").length;
  const yourRole = sections.yourRole ? byId.get(sections.yourRole) : undefined;
  const policies = pick(sections.policies);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Handbook"
        description={
          items.length === 0
            ? "Policies, how-tos and who to ask."
            : `${items.length} ${items.length === 1 ? "document" : "documents"}${toRead > 0 ? ` · ${toRead} ${readerName ? `${readerName} hasn't read` : "to read"}` : ""}`
        }
        action={headerAction}
      />

      {banner}

      {items.length > 0 ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the handbook"
            aria-label="Search the handbook"
            className="pl-9"
          />
        </div>
      ) : null}

      {terms.length === 0 &&
        sections.alerts.map((alert) => (
          <div
            key={alert.id}
            role="status"
            className="flex flex-col gap-3 rounded-xl bg-warn/8 px-4 py-3 ring-1 ring-inset ring-warn/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm">
              <span className="font-medium">{alert.title}</span> was updated on{" "}
              {alert.updatedOn}.
              {alert.changeNote ? (
                <span className="text-muted-foreground"> {alert.changeNote}</span>
              ) : null}
            </p>
            <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
              <Link href={alert.href}>Read changes</Link>
            </Button>
          </div>
        ))}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {terms.length > 0 ? (
            results.length === 0 ? (
              <EmptyState illustration="search" title={`Nothing matches “${query.trim()}”.`} />
            ) : (
              <SectionCard
                title={`${results.length} ${results.length === 1 ? "result" : "results"}`}
                items={results}
              />
            )
          ) : items.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<BookOpen className="size-5" />}
                  title="Nothing in the handbook yet."
                  description="Policies and guides show up here once they're published."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <StartHereCard items={pick(sections.startHere)} />
              {yourRole ? <SectionCard title="Your role" items={[yourRole]} /> : null}
              {sections.departments.map((department) => (
                <SectionCard
                  key={department.id}
                  title={`${department.name} · how we work`}
                  items={pick(department.docIds)}
                />
              ))}
              {policies.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h2 className="card-title">Company policies</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {policies.map((item) => (
                      <HandbookDocCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              ) : null}
              <SectionCard title="More in the handbook" items={pick(sections.other)} />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">{aside}</div>
      </div>
    </div>
  );
}
