"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowUpRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Globe,
  HardDrive,
  NotebookText,
  Palette,
  PenTool,
  Play,
  Presentation,
  TriangleAlert,
  Video,
} from "lucide-react";
import { getLinkPreviews, type LinkPreview } from "@/lib/actions/link-previews";
import {
  canFetchTitle,
  fallbackTitle,
  parseLink,
  siteLabel,
  type KnownApp,
  type ParsedLink,
} from "@/lib/links/known";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// One request for every link on screen: links ask, a short timer sends them
// together, and answers are kept for the session.

const cache = new Map<string, LinkPreview | null>();
const waiting = new Map<string, Array<(preview: LinkPreview | null) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const urls = [...waiting.keys()].slice(0, 20);
  const callbacks = urls.map((url) => [url, waiting.get(url) ?? []] as const);
  urls.forEach((url) => waiting.delete(url));
  if (waiting.size > 0) timer = setTimeout(flush, 30);
  getLinkPreviews(urls)
    .catch(() => ({}) as Record<string, LinkPreview | null>)
    .then((result) => {
      for (const [url, list] of callbacks) {
        const preview = result[url] ?? null;
        if (url in result) cache.set(url, preview);
        list.forEach((done) => done(preview));
      }
    });
}

function requestPreview(url: string, done: (preview: LinkPreview | null) => void) {
  const list = waiting.get(url);
  if (list) list.push(done);
  else waiting.set(url, [done]);
  timer ??= setTimeout(flush, 30);
}

function usePreview(link: ParsedLink | null): LinkPreview | null {
  const url = link?.kind === "web" && canFetchTitle(link.app) ? link.url : null;
  const [preview, setPreview] = useState<LinkPreview | null>(() =>
    url ? (cache.get(url) ?? null) : null,
  );
  useEffect(() => {
    if (!url || cache.has(url)) return;
    let live = true;
    requestPreview(url, (next) => {
      if (live) setPreview(next);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return url ? (cache.get(url) ?? preview) : null;
}

// ---------------------------------------------------------------------------

const APP_ICONS: Record<KnownApp, { Icon: ComponentType<{ className?: string }>; tone: string }> = {
  docs: { Icon: FileText, tone: "bg-[#4285F4]/15 text-[#7aa7f7]" },
  sheets: { Icon: FileSpreadsheet, tone: "bg-[#34A853]/15 text-[#5fc27e]" },
  slides: { Icon: Presentation, tone: "bg-[#FBBC04]/15 text-[#f6cd57]" },
  forms: { Icon: ClipboardList, tone: "bg-[#7248B9]/20 text-[#b59ae6]" },
  drive: { Icon: HardDrive, tone: "bg-[#4285F4]/15 text-[#7aa7f7]" },
  figma: { Icon: PenTool, tone: "bg-[#A259FF]/15 text-[#c49bff]" },
  notion: { Icon: NotebookText, tone: "bg-fill-active text-foreground" },
  canva: { Icon: Palette, tone: "bg-[#00C4CC]/15 text-[#4fd8dd]" },
  loom: { Icon: Video, tone: "bg-[#625DF5]/20 text-[#a3a0fa]" },
  youtube: { Icon: Play, tone: "bg-[#FF0000]/15 text-[#ff6b6b]" },
};

function LinkIcon({
  link,
  preview,
  size,
}: {
  link: Extract<ParsedLink, { kind: "web" }>;
  preview: LinkPreview | null;
  size: "sm" | "md";
}) {
  const [broken, setBroken] = useState(false);
  const box = size === "md" ? "size-8 rounded-lg" : "size-4 rounded-[4px]";
  const glyph = size === "md" ? "size-4" : "size-3";
  if (link.app) {
    const { Icon, tone } = APP_ICONS[link.app];
    return (
      <span className={cn("flex shrink-0 items-center justify-center", box, tone)}>
        <Icon className={glyph} />
      </span>
    );
  }
  if (preview?.iconUrl && !broken) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden", box, size === "md" && "bg-fill-active")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- any site's icon, not a known host */}
        <img
          src={preview.iconUrl}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
          className={size === "md" ? "size-4" : "size-full"}
        />
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center text-muted-foreground", box, size === "md" && "bg-fill-active")}>
      <Globe className={glyph} />
    </span>
  );
}

function sameAsUrl(label: string | undefined, url: string): boolean {
  if (!label) return true;
  const a = label.trim().replace(/\/$/, "");
  return a === url.replace(/\/$/, "") || url.includes(a);
}

/** A link on its own line: icon, title, site. */
export function LinkCard({ href, label }: { href: string; label?: string }) {
  const link = parseLink(href);
  const preview = usePreview(link);
  if (!link) return null;
  if (link.kind === "file") return <FileLinkCard name={link.name} />;

  const custom = label && !sameAsUrl(label, link.url) ? label : null;
  const title = custom ?? preview?.title ?? fallbackTitle(link);
  const site = preview?.siteName && !link.app ? preview.siteName : siteLabel(link);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.url}
      className="group flex min-w-0 items-center gap-3 rounded-xl bg-fill-subtle px-3.5 py-3 ring-1 ring-inset ring-edge transition-colors outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <LinkIcon link={link} preview={preview} size="md" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-foreground">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{site}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </a>
  );
}

/** A link inside a sentence: small icon and a short name. */
export function LinkChip({ href, children }: { href: string; children?: ReactNode }) {
  const link = parseLink(href);
  const preview = usePreview(link);
  if (!link) return <>{children}</>;
  if (link.kind === "file") return <FileLinkChip name={link.name} />;

  const text = typeof children === "string" ? children : undefined;
  const custom = text && !sameAsUrl(text, link.url) ? text : null;
  const name = custom ?? (link.app ? (preview?.title ?? siteLabel(link)) : link.host);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={preview?.title ? `${preview.title} · ${link.url}` : link.url}
      className="mx-0.5 inline-flex max-w-full translate-y-[-1px] items-center gap-1.5 rounded-md bg-fill-subtle px-1.5 align-middle text-[13px] leading-6 font-medium text-foreground ring-1 ring-inset ring-edge transition-colors hover:bg-fill-hover"
    >
      <LinkIcon link={link} preview={preview} size="sm" />
      <span className="truncate">{name}</span>
    </a>
  );
}

const FILE_HINT =
  "This points to a file on the writer's own computer, so nobody else can open it. Upload it to Drive and share the link instead.";

function FileLinkCard({ name }: { name: string }) {
  return (
    <div
      title={FILE_HINT}
      className="flex min-w-0 items-center gap-3 rounded-xl bg-warn/[0.06] px-3.5 py-3 ring-1 ring-inset ring-warn/30"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warn/15 text-warn">
        <TriangleAlert className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium">{name}</span>
        <span className="truncate text-xs text-warn">Local file · only they can open it</span>
      </span>
    </div>
  );
}

function FileLinkChip({ name }: { name: string }) {
  return (
    <span
      title={FILE_HINT}
      className="mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md bg-warn/10 px-1.5 align-middle text-[13px] leading-6 text-warn"
    >
      <TriangleAlert className="size-3" />
      <span className="truncate">{name}</span>
    </span>
  );
}
