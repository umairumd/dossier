"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { searchMyReports } from "@/lib/actions/reports";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { Input } from "@/components/ui/input";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

export function ReportSearch({
  deadline,
  userName,
  children,
  templates,
}: {
  deadline: DeadlineContext;
  userName: string;
  children: ReactNode;
  templates?: ReportTemplateWithFields[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    query: string;
    reports: DailyReport[];
  } | null>(null);

  const trimmedQuery = query.trim();
  const inSearchMode = trimmedQuery.length >= 2;
  const matchedResults =
    results?.query === trimmedQuery ? results.reports : null;
  const isSearching = inSearchMode && matchedResults === null;

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void searchMyReports(trimmedQuery)
        .then((reports) => {
          if (!cancelled) {
            setResults({ query: trimmedQuery, reports });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults({ query: trimmedQuery, reports: [] });
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your reports..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="px-9"
        />
        {isSearching ? (
          <Loader2 className="absolute top-1/2 right-3 size-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      {inSearchMode ? (
        <div className="flex flex-col gap-1">
          {matchedResults !== null && (
            <p className="px-1 text-xs text-muted-foreground">
              {matchedResults.length} result
              {matchedResults.length !== 1 ? "s" : ""} for &quot;{trimmedQuery}&quot;
            </p>
          )}
          {matchedResults === null ? null : matchedResults.length === 0 ? (
            <EmptyState
              illustration="search"
              title="No reports match your search."
            />
          ) : (
            <ReportHistoryBrowser
              reports={matchedResults}
              deadline={deadline}
              userName={userName}
              showProfileLink={false}
              templates={templates}
            />
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
