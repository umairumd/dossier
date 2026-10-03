"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import {
  FilterSearchInput,
  FilterToolbar,
  filterSelectTriggerClassName,
} from "@/components/shared/filter-toolbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadActivityPage } from "@/lib/actions/admin/activity";
import {
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/helpers/activity-categories";
import type { ActivityLogEntry } from "@/types/activity";

type CategoryFilter = "all" | ActivityCategory;
type RangeFilter = "week" | "month" | "all";

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All activities" },
  ...(Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[]).map(
    (value) => ({ value, label: ACTIVITY_CATEGORY_LABELS[value] }),
  ),
];

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

export function ActivityPageClient({
  initialItems,
  initialHasMore,
  canDelete,
}: {
  initialItems: ActivityLogEntry[];
  initialHasMore: boolean;
  canDelete: boolean;
}) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");

  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState<string | null>(
    initialHasMore
      ? (initialItems[initialItems.length - 1]?.created_at ?? null)
      : null,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const skipCategoryRangeEffect = useRef(true);
  const skipQueryEffect = useRef(true);
  const loadingMoreRef = useRef(false);

  const filtersRef = useRef({ category, range, query });
  filtersRef.current = { category, range, query };

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const refreshFromTop = useCallback(async () => {
    const { category: nextCategory, range: nextRange, query: nextQuery } =
      filtersRef.current;
    setIsRefreshing(true);
    setItems([]);
    setCursor(null);
    setHasMore(true);
    try {
      const result = await loadActivityPage({
        cursor: null,
        category: nextCategory,
        range: nextRange,
        query: nextQuery,
      });
      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) {
      return;
    }
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const { category: nextCategory, range: nextRange, query: nextQuery } =
      filtersRef.current;
    try {
      const result = await loadActivityPage({
        cursor: cursorRef.current,
        category: nextCategory,
        range: nextRange,
        query: nextQuery,
      });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (skipCategoryRangeEffect.current) {
      skipCategoryRangeEffect.current = false;
      return;
    }
    void refreshFromTop();
  }, [category, range, refreshFromTop]);

  useEffect(() => {
    if (skipQueryEffect.current) {
      skipQueryEffect.current = false;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void refreshFromTop();
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [query, refreshFromTop]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasMoreRef.current &&
          !loadingMoreRef.current
        ) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, items.length]);

  const isFiltering =
    category !== "all" || query.trim() !== "" || range !== "all";

  return (
    <div className="flex flex-col gap-4">
      <FilterToolbar
        search={
          <FilterSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by person..."
          />
        }
        filters={[
          <Select
            key="category"
            value={category}
            onValueChange={(value) => setCategory(value as CategoryFilter)}
          >
            <SelectTrigger
              className={filterSelectTriggerClassName}
              aria-label="Event category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
          <Select
            key="range"
            value={range}
            onValueChange={(value) => setRange(value as RangeFilter)}
          >
            <SelectTrigger
              className={filterSelectTriggerClassName}
              aria-label="Date range"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Invitations, archives, departments, reports, attendance, and
            settings changes across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRefreshing && items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          ) : (
            <ActivityFeed
              variant="page"
              items={items}
              canDelete={canDelete}
              emptyMessage={
                isFiltering
                  ? "No activity matches your filters."
                  : "No recent activity."
              }
              footer={
                <>
                  <div ref={sentinelRef} className="h-1" aria-hidden />
                  {isLoadingMore ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Loading…
                    </p>
                  ) : null}
                </>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
