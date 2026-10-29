import type { ComponentProps } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkCard, LinkChip } from "@/components/shared/link-preview";
import { cn } from "@/lib/utils";

// Compact Markdown for things people type: report answers, comments, task
// details, announcements. Bare links become clickable, single line breaks are
// kept (so old plain-text answers look the way they were typed), and raw HTML
// is ignored. The handbook uses the roomier MarkdownBody.

type MdNode = { type: string; value?: string; url?: string; children?: MdNode[] };

const FILE_PATH = /file:\/\/\S+/gi;

/** Makes pasted file:/// paths links, so they can be shown with a warning. */
function remarkFileLinks() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children || node.type === "link") return;
      const next: MdNode[] = [];
      for (const child of node.children) {
        if (child.type === "text" && child.value && FILE_PATH.test(child.value)) {
          FILE_PATH.lastIndex = 0;
          let last = 0;
          for (const match of child.value.matchAll(FILE_PATH)) {
            const at = match.index ?? 0;
            if (at > last) next.push({ type: "text", value: child.value.slice(last, at) });
            next.push({ type: "link", url: match[0], children: [{ type: "text", value: match[0] }] });
            last = at + match[0].length;
          }
          if (last < child.value.length) next.push({ type: "text", value: child.value.slice(last) });
        } else {
          walk(child);
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}

function urlTransform(url: string): string {
  return /^file:\/\//i.test(url) ? url : defaultUrlTransform(url);
}

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

/** Links alone in a paragraph (one per line) become cards. */
function loneLinks(node: unknown): { href: string; label: string }[] | null {
  const kids = ((node as HastNode | undefined)?.children ?? []).filter(
    (kid) => !(kid.type === "text" && !(kid.value ?? "").trim()),
  );
  if (kids.length === 0) return null;
  const links: { href: string; label: string }[] = [];
  for (const kid of kids) {
    if (kid.type === "element" && kid.tagName === "br") continue;
    if (kid.type === "element" && kid.tagName === "a" && typeof kid.properties?.href === "string") {
      links.push({ href: kid.properties.href, label: hastText(kid) });
      continue;
    }
    return null;
  }
  return links.length > 0 ? links : null;
}

/** Turns every newline inside text into a line break, like a chat message. */
function remarkKeepBreaks() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children) return;
      const next: MdNode[] = [];
      for (const child of node.children) {
        if (child.type === "text" && child.value?.includes("\n")) {
          child.value.split("\n").forEach((part, index) => {
            if (index > 0) next.push({ type: "break" });
            if (part) next.push({ type: "text", value: part });
          });
        } else {
          walk(child);
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}

type WithNode<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & {
  node?: unknown;
};

function strip<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node: _node, ...rest } = props;
  void _node;
  return rest;
}

const heading = (props: WithNode<"h3">) => (
  <p {...strip(props)} className="mt-3 mb-1 font-semibold first:mt-0" />
);

const components: Components = {
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  p: (props: WithNode<"p">) => {
    const links = loneLinks(props.node);
    if (links) {
      return (
        <span className="my-2 grid gap-2 first:mt-0 last:mb-0 sm:grid-cols-2">
          {links.map((link, index) => (
            <LinkCard key={`${link.href}-${index}`} href={link.href} label={link.label} />
          ))}
        </span>
      );
    }
    return <p {...strip(props)} className="my-1.5 first:mt-0 last:mb-0" />;
  },
  a: ({ href, children, ...props }: WithNode<"a">) => {
    if (typeof href === "string" && /^(https?|file):\/\//i.test(href)) {
      return <LinkChip href={href}>{children}</LinkChip>;
    }
    return (
      <a
        {...strip(props)}
        href={href}
        className="font-medium underline underline-offset-4 decoration-foreground/30 [overflow-wrap:anywhere] hover:decoration-foreground"
      >
        {children}
      </a>
    );
  },
  ul: (props: WithNode<"ul">) => (
    <ul {...strip(props)} className="my-1.5 flex list-disc flex-col gap-0.5 pl-5 marker:text-muted-foreground first:mt-0 last:mb-0" />
  ),
  ol: (props: WithNode<"ol">) => (
    <ol {...strip(props)} className="my-1.5 flex list-decimal flex-col gap-0.5 pl-5 marker:text-muted-foreground first:mt-0 last:mb-0" />
  ),
  li: (props: WithNode<"li">) => <li {...strip(props)} className="pl-0.5" />,
  input: (props: WithNode<"input">) => (
    <input {...strip(props)} disabled className="mr-1.5 translate-y-px accent-foreground" />
  ),
  blockquote: (props: WithNode<"blockquote">) => (
    <blockquote {...strip(props)} className="my-2 border-l-2 border-line-strong pl-3 text-muted-foreground" />
  ),
  code: ({ className, ...props }: WithNode<"code">) => (
    <code
      {...strip(props)}
      className={cn("rounded bg-fill-subtle px-1 py-0.5 font-mono text-[12.5px]", className)}
    />
  ),
  pre: (props: WithNode<"pre">) => (
    <pre
      {...strip(props)}
      className="my-2 overflow-x-auto rounded-lg bg-fill-subtle p-3 text-[12.5px] ring-1 ring-inset ring-edge [&_code]:bg-transparent [&_code]:p-0"
    />
  ),
  hr: () => <hr className="my-3 border-line" />,
  img: ({ src, alt }: WithNode<"img">) =>
    typeof src === "string" ? (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-4 decoration-foreground/30"
      >
        {alt || "Image"}
      </a>
    ) : null,
  table: (props: WithNode<"table">) => (
    <div className="my-2 overflow-x-auto">
      <table {...strip(props)} className="w-full text-left text-[13px]" />
    </div>
  ),
  th: (props: WithNode<"th">) => (
    <th {...strip(props)} className="border-b border-line px-2 py-1 font-medium" />
  ),
  td: (props: WithNode<"td">) => (
    <td {...strip(props)} className="border-b border-line px-2 py-1 align-top" />
  ),
};

const LONE_LINK = /^(https?:\/\/\S+|file:\/\/\S+)$/i;
const NUMBERED = /^(\d{1,3})\s*[.),:-]\s*(.+)$/;
const BULLET = /^[-*•–]\s+(.+)$/;
const CHECK = /^[-*]\s+\[( |x|X)\]\s+(.+)$/;
const HEADING = /^#{1,6}\s+(.+)$/;

export type ReportLine =
  | { kind: "heading"; text: string }
  | { kind: "number"; marker: string; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "check"; done: boolean; text: string }
  | { kind: "text"; text: string };

/**
 * Reads a typed answer line by line, the way people write them: their own
 * numbers are kept as typed ("3.Zeus" stays 3, nothing is renumbered), "-"
 * and "•" lines are bullets, a short line just before a list is its heading,
 * and plain lines become points when there are several. Links that sit on
 * their own line are gathered as cards; a short line right after one
 * ("backlinks sheet") names it. Returns null for text that needs full
 * Markdown (code or tables).
 */
export function splitPoints(
  text: string,
): { lines: ReportLine[]; links: { href: string; label?: string }[] } | null {
  if (/^\s*(```|\|)/m.test(text)) return null;
  const raw = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const links: { href: string; label?: string }[] = [];
  const kept: string[] = [];
  let afterLink = false;
  for (const line of raw) {
    if (LONE_LINK.test(line)) {
      links.push({ href: line });
      afterLink = true;
      continue;
    }
    if (afterLink && line.length <= 40 && !/(https?|file):\/\//i.test(line)) {
      links[links.length - 1].label = line;
      afterLink = false;
      continue;
    }
    kept.push(line);
    afterLink = false;
  }

  const typed = kept.map((line): ReportLine => {
    const heading = line.match(HEADING);
    if (heading) return { kind: "heading", text: heading[1] };
    const numbered = line.match(NUMBERED);
    if (numbered) return { kind: "number", marker: numbered[1], text: numbered[2] };
    const check = line.match(CHECK);
    if (check) return { kind: "check", done: check[1].toLowerCase() === "x", text: check[2] };
    const bullet = line.match(BULLET);
    if (bullet) return { kind: "bullet", text: bullet[1] };
    return { kind: "text", text: line };
  });

  const isList = (line: ReportLine | undefined) =>
    line?.kind === "number" || line?.kind === "bullet" || line?.kind === "check";
  const plainCount = typed.filter((line) => line.kind === "text").length;
  const lines = typed.map((line, index): ReportLine => {
    if (line.kind !== "text") return line;
    if (line.text.length <= 40 && !/[.!?]$/.test(line.text) && isList(typed[index + 1])) {
      return { kind: "heading", text: line.text.replace(/:$/, "") };
    }
    return plainCount > 1 ? { kind: "bullet", text: line.text } : line;
  });

  return { lines, links };
}

const INLINE_COMPONENTS: Components = {
  ...components,
  p: ({ children }) => <>{children}</>,
};

/** One line's inline Markdown: bold, italics, code and links. */
function InlineMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkFileLinks]}
      components={INLINE_COMPONENTS}
      urlTransform={urlTransform}
      disallowedElements={["ul", "ol", "li", "blockquote", "pre", "hr", "table", "h1", "h2", "h3", "h4", "h5", "h6"]}
      unwrapDisallowed
    >
      {text}
    </ReactMarkdown>
  );
}

function ReportLines({ lines }: { lines: ReportLine[] }) {
  const wide = lines.some((line) => line.kind === "number" && line.marker.length > 1);
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, index) => {
        if (line.kind === "heading") {
          return (
            <p key={index} className="mt-2 font-medium first:mt-0">
              <InlineMarkdown text={line.text} />
            </p>
          );
        }
        if (line.kind === "check") {
          return (
            <div key={index} className="flex gap-2">
              <span
                aria-hidden
                className={cn(
                  "mt-1 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                  line.done ? "border-ok bg-ok text-background" : "border-line-strong",
                )}
              >
                {line.done ? "✓" : null}
              </span>
              <span className={cn("min-w-0 flex-1", line.done && "text-muted-foreground line-through")}>
                <InlineMarkdown text={line.text} />
              </span>
            </div>
          );
        }
        if (line.kind === "text") {
          return (
            <p key={index}>
              <InlineMarkdown text={line.text} />
            </p>
          );
        }
        return (
          <div key={index} className="flex gap-2">
            <span
              aria-hidden
              className={cn(
                "shrink-0 text-right text-muted-foreground tabular-nums",
                line.kind === "number" ? (wide ? "w-6" : "w-4") : "w-4",
              )}
            >
              {line.kind === "number" ? `${line.marker}.` : "•"}
            </span>
            <span className="min-w-0 flex-1">
              <InlineMarkdown text={line.text} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkFileLinks, remarkKeepBreaks]}
      components={components}
      urlTransform={urlTransform}
    >
      {text}
    </ReactMarkdown>
  );
}

export function RichText({
  text,
  className,
  variant = "compact",
}: {
  text: string;
  className?: string;
  /** "points" is the report reader: one point per line, links as cards. */
  variant?: "compact" | "points";
}) {
  if (variant === "points") {
    const split = splitPoints(text);
    return (
      <div
        className={cn(
          "flex max-w-[72ch] flex-col gap-3 text-sm leading-6 break-words text-foreground",
          className,
        )}
      >
        {split ? (
          <>
            {split.lines.length > 0 ? <ReportLines lines={split.lines} /> : null}
            {split.links.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {split.links.map((link, index) => (
                  <LinkCard key={`${link.href}-${index}`} href={link.href} label={link.label} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div>
            <Markdown text={text} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={cn("text-sm leading-relaxed break-words text-foreground", className)}>
      <Markdown text={text} />
    </div>
  );
}
