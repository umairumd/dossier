import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Compact Markdown for things people type: report answers, comments, task
// details, announcements. Bare links become clickable, single line breaks are
// kept (so old plain-text answers look the way they were typed), and raw HTML
// is ignored. The handbook uses the roomier MarkdownBody.

type MdNode = { type: string; value?: string; children?: MdNode[] };

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
  p: (props: WithNode<"p">) => <p {...strip(props)} className="my-1.5 first:mt-0 last:mb-0" />,
  a: ({ href, ...props }: WithNode<"a">) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        {...strip(props)}
        href={href}
        className="font-medium underline underline-offset-4 decoration-foreground/30 [overflow-wrap:anywhere] hover:decoration-foreground"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      />
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

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed break-words text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkKeepBreaks]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
