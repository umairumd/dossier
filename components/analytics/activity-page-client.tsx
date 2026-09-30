"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_CATEGORY_LABELS,
  EVENT_CATEGORY,
  type ActivityCategory,
} from "@/lib/helpers/activity-categories";
import type { ActivityLogEntry } from "@/types/activity";

type CategoryFilter = "all" | ActivityCategory;
type RangeFilter = "week" | "month" | "all";

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[]).map(
    (value) => ({ value, label: ACTIVITY_CATEGORY_LABELS[value] }),
  ),
];

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

/** Start of the current week (Monday) or month in the viewer's local time. */
function rangeStart(range: RangeFilter): number | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday,
  ).getTime();
}

export function ActivityPageClient({
  items,
  canDelete,
}: {
  items: ActivityLogEntry[];
  canDelete: boolean;
}) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const start = rangeStart(range);
    return items.filter((item) => {
      if (category !== "all" && EVENT_CATEGORY[item.event_type] !== category) {
        return false;
      }
      if (start !== null && new Date(item.created_at).getTime() < start) {
        return false;
      }
      if (needle) {
        const haystack = `${item.actor_name ?? ""} ${item.target_name ?? ""}`
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [items, category, query, range]);

  const isFiltering = category !== "all" || query.trim() !== "" || range !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by person..."
            className="pl-8"
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as CategoryFilter)}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Event category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={range}
          onValueChange={(value) => setRange(value as RangeFilter)}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Invitations, archives, departments, reports, attendance, and
            settings changes across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            variant="page"
            items={filtered}
            canDelete={canDelete}
            emptyMessage={
              isFiltering
                ? "No activity matches your filters."
                : "No recent activity."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
