import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHeadingSlugger } from "@/lib/handbook/format";
import { cn } from "@/lib/utils";

// Minimal hast shapes: enough for the two passes below.
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const BLOCK_TAGS = new Set(["p", "ul", "ol", "pre", "blockquote", "table", "div", "h4", "h5", "h6"]);
const STEPS_CLASS = "handbook-steps";

function textContent(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

function isBlank(node: HastNode): boolean {
  return node.type === "text" && !(node.value ?? "").trim();
}

function element(tagName: string, className: string, children: HastNode[]): HastNode {
  return { type: "element", tagName, properties: { className: [className] }, children };
}

/** Splits a step into its first line (title) and the rest (body). */
function splitStep(kids: HastNode[]): { title: HastNode[]; body: HastNode[] } {
  const items = kids.filter((kid, index) => !(index === 0 && isBlank(kid)));
  const first = items.find((kid) => !isBlank(kid));
  if (first?.type === "element" && first.tagName === "p") {
    const inner = splitStep(first.children ?? []);
    const rest = items.slice(items.indexOf(first) + 1).filter((kid) => !isBlank(kid));
    const lead = inner.body.length > 0 ? [{ ...first, children: inner.body }] : [];
    return { title: inner.title, body: [...lead, ...rest] };
  }

  const title: HastNode[] = [];
  const body: HastNode[] = [];
  let inBody = false;
  for (const kid of items) {
    if (inBody) {
      body.push(kid);
      continue;
    }
    if (kid.type === "element" && BLOCK_TAGS.has(kid.tagName ?? "")) {
      inBody = true;
      body.push(kid);
      continue;
    }
    if (kid.type === "text" && kid.value?.includes("\n")) {
      const [head, ...tail] = kid.value.split("\n");
      if (head.trim()) title.push({ type: "text", value: head });
      const rest = tail.join("\n");
      if (rest.trim()) body.push({ type: "text", value: rest.trimStart() });
      inBody = true;
      continue;
    }
    if (kid.type === "element" && kid.tagName === "br") {
      inBody = true;
      continue;
    }
    title.push(kid);
  }
  return { title, body: body.filter((kid, index) => !(index === 0 && isBlank(kid))) };
}

/** Heading ids for h1–h3 and, for SOPs, top-level ordered lists as steps. */
function rehypeHandbook(options: { steps: boolean }) {
  return (tree: HastNode) => {
    const slug = createHeadingSlugger();
    const walk = (node: HastNode, depth: number) => {
      if (node.type === "element" && /^h[1-3]$/.test(node.tagName ?? "")) {
        node.properties = { ...node.properties, id: slug(textContent(node)) };
      }
      if (options.steps && depth === 1 && node.type === "element" && node.tagName === "ol") {
        node.properties = { ...node.properties, className: [STEPS_CLASS] };
        let step = 0;
        for (const li of node.children ?? []) {
          if (li.type !== "element" || li.tagName !== "li") continue;
          step += 1;
          const { title, body } = splitStep(li.children ?? []);
          li.properties = { ...li.properties, dataStep: step };
          li.children = [
            element("span", "step-title", title),
            ...(body.length > 0 ? [element("div", "step-body", body)] : []),
          ];
        }
      }
      for (const child of node.children ?? []) walk(child, depth + 1);
    };
    walk(tree, 0);
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

const components: Components = {
  h1: (props: WithNode<"h1">) => (
    <h2 {...strip(props)} className="mt-8 mb-3 scroll-mt-24 text-xl font-semibold tracking-tight first:mt-0" />
  ),
  h2: (props: WithNode<"h2">) => (
    <h2 {...strip(props)} className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold tracking-tight first:mt-0" />
  ),
  h3: (props: WithNode<"h3">) => (
    <h3 {...strip(props)} className="mt-6 mb-2 scroll-mt-24 text-base font-semibold first:mt-0" />
  ),
  h4: (props: WithNode<"h4">) => (
    <h4 {...strip(props)} className="mt-5 mb-2 text-[15px] font-semibold" />
  ),
  p: (props: WithNode<"p">) => <p {...strip(props)} className="my-3 leading-7" />,
  a: ({ href, ...props }: WithNode<"a">) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        {...strip(props)}
        href={href}
        className="font-medium underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      />
    );
  },
  ul: (props: WithNode<"ul">) => (
    <ul {...strip(props)} className="my-3 flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground" />
  ),
  ol: ({ className, ...props }: WithNode<"ol">) =>
    className?.includes(STEPS_CLASS) ? (
      <ol
        {...strip(props)}
        className="my-4 flex flex-col divide-y divide-line overflow-hidden rounded-xl ring-1 ring-inset ring-edge"
      />
    ) : (
      <ol {...strip(props)} className="my-3 flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted-foreground" />
    ),
  li: ({ children, ...props }: WithNode<"li">) => {
    const step = (props as Record<string, unknown>)["data-step"];
    if (step == null) {
      return <li {...strip(props)} className="pl-1 leading-7">{children}</li>;
    }
    return (
      <li className="flex gap-3 px-4 py-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fill-active text-xs font-semibold tabular-nums"
        >
          {String(step)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 leading-6">{children}</div>
      </li>
    );
  },
  span: ({ className, ...props }: WithNode<"span">) => (
    <span
      {...strip(props)}
      className={className === "step-title" ? "font-medium" : className}
    />
  ),
  div: ({ className, ...props }: WithNode<"div">) => (
    <div
      {...strip(props)}
      className={
        className === "step-body"
          ? "text-muted-foreground [&>ol]:my-1 [&>p]:my-1 [&>ul]:my-1"
          : className
      }
    />
  ),
  blockquote: (props: WithNode<"blockquote">) => (
    <blockquote {...strip(props)} className="my-4 border-l-2 border-line-strong pl-4 text-muted-foreground" />
  ),
  code: ({ className, ...props }: WithNode<"code">) => (
    <code
      {...strip(props)}
      className={cn(
        "rounded-md bg-fill-subtle px-1 py-0.5 font-mono text-[13px]",
        className,
      )}
    />
  ),
  pre: (props: WithNode<"pre">) => (
    <pre
      {...strip(props)}
      className="my-4 overflow-x-auto rounded-lg bg-fill-subtle p-4 text-[13px] leading-6 ring-1 ring-inset ring-edge [&_code]:bg-transparent [&_code]:p-0"
    />
  ),
  hr: () => <hr className="my-8 border-line" />,
  table: (props: WithNode<"table">) => (
    <div className="my-4 overflow-x-auto rounded-lg ring-1 ring-inset ring-edge">
      <table {...strip(props)} className="w-full text-sm" />
    </div>
  ),
  th: (props: WithNode<"th">) => (
    <th {...strip(props)} className="border-b border-edge bg-fill-subtle px-3 py-2 text-left font-medium" />
  ),
  td: (props: WithNode<"td">) => (
    <td {...strip(props)} className="border-b border-line px-3 py-2 align-top" />
  ),
  img: ({ alt, ...props }: WithNode<"img">) => (
    // Authors link images by URL; there is no image pipeline to optimise them.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...strip(props)} alt={alt ?? ""} className="my-4 max-w-full rounded-lg" />
  ),
};

/** Handbook markdown. Raw HTML is dropped. */
export function MarkdownBody({
  markdown,
  steps = false,
  className,
}: {
  markdown: string;
  /** SOPs: top-level numbered lists render as step rows. */
  steps?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-[15px] text-foreground [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHandbook, { steps }]]}
        skipHtml
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
