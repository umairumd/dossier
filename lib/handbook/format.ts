import type { HandbookKind, HandbookReadState } from "@/types/handbook";

export const HANDBOOK_KINDS: HandbookKind[] = ["policy", "sop", "jd", "guide"];

export const HANDBOOK_KIND_LABELS: Record<HandbookKind, string> = {
  policy: "Policy",
  sop: "SOP",
  jd: "Job description",
  guide: "Guide",
};

/** Short tag text. */
export const HANDBOOK_KIND_TAGS: Record<HandbookKind, string> = {
  policy: "Policy",
  sop: "SOP",
  jd: "JD",
  guide: "Guide",
};

/** URL-safe slug: lowercase words joined by hyphens. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Heading ids: slugs, with -2, -3 for repeats, in document order. */
export function createHeadingSlugger(): (text: string) => string {
  const used = new Map<string, number>();
  return (text) => {
    const base = slugify(text) || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

/** Plain text of a markdown heading line (links, emphasis and code removed). */
function headingText(source: string): string {
  return source
    .replace(/\s+#+\s*$/, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

/** h2s for "On this page", with the same ids the renderer gives them. */
export function extractOutline(markdown: string): { id: string; text: string }[] {
  const slug = createHeadingSlugger();
  const outline: { id: string; text: string }[] = [];
  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (!heading) continue;
    const level = heading[1].length;
    const text = headingText(heading[2]);
    if (level > 3 || !text) continue;
    const id = slug(text);
    if (level === 2) outline.push({ id, text });
  }
  return outline;
}

export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "Oct 2", in the org's time zone. */
export function formatShortDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** "Oct 2, 2026", in the org's time zone. */
export function formatLongDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

export type HandbookReadStatus = "read" | "outdated" | "unread";

export function readStatus(
  doc: { version: number },
  read: HandbookReadState | undefined,
): HandbookReadStatus {
  if (!read) return "unread";
  return read.version >= doc.version ? "read" : "outdated";
}

/** Draft (never published), Published vN, or Draft vN+1 (unpublished edits). */
export function docStatus(doc: {
  version: number;
  draftMd: string;
  bodyMd: string;
  archivedAt?: string | null;
}): { label: string; variant: "neutral" | "success" | "info" } {
  if (doc.archivedAt) return { label: "Archived", variant: "neutral" };
  if (doc.version === 0) return { label: "Draft", variant: "neutral" };
  if (doc.draftMd !== doc.bodyMd) {
    return { label: `Draft v${doc.version + 1}`, variant: "info" };
  }
  return { label: `Published v${doc.version}`, variant: "success" };
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
