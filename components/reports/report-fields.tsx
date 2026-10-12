import { Check, ExternalLink, Link2, X } from "lucide-react";
import { fieldResponse } from "@/lib/reports/field-response";
import { cn } from "@/lib/utils";
import type { DailyReport } from "@/types/report";
import type { TemplateField } from "@/types/template";

// Read-only report body for the report reader. The layout adapts to the
// template, in the template's order:
// - long text (and long short-text answers) read as paragraphs;
// - two or more numbers in a row become one strip of figures;
// - other short answers in a row become one list of facts (label left,
//   answer right);
// - links get their own row with the site name;
// - unanswered fields are not shown at all.

const LONG_SHORT_TEXT = 60;

type Answer = { label: string; field: Pick<TemplateField, "fieldType" | "unit">; value: unknown };

type Block =
  | { kind: "text"; key: string; label: string; text: string }
  | { kind: "link"; key: string; label: string; href: string }
  | { kind: "figures"; key: string; items: Answer[] }
  | { kind: "facts"; key: string; items: Answer[] };

function isAnswered(fieldType: TemplateField["fieldType"], value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (fieldType === "checkbox") return typeof value === "boolean";
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value.trim() : String(value);
}

function humanise(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildBlocks(answers: (Answer & { key: string })[]): Block[] {
  const blocks: Block[] = [];
  let run: (Answer & { key: string })[] = [];

  const flush = () => {
    let i = 0;
    while (i < run.length) {
      if (run[i].field.fieldType === "number") {
        let j = i;
        while (j < run.length && run[j].field.fieldType === "number") j += 1;
        if (j - i >= 2) {
          blocks.push({ kind: "figures", key: run[i].key, items: run.slice(i, j) });
          i = j;
          continue;
        }
      }
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "facts" && blocks.length > 0 && last.items.at(-1) === run[i - 1]) {
        last.items.push(run[i]);
      } else {
        blocks.push({ kind: "facts", key: run[i].key, items: [run[i]] });
      }
      i += 1;
    }
    run = [];
  };

  for (const answer of answers) {
    const { fieldType } = answer.field;
    const text = asText(answer.value);
    const isLongText =
      fieldType === "textarea" ||
      (fieldType === "text" && text.length > LONG_SHORT_TEXT);
    if (isLongText) {
      flush();
      blocks.push({ kind: "text", key: answer.key, label: answer.label, text });
    } else if (fieldType === "url") {
      flush();
      blocks.push({ kind: "link", key: answer.key, label: answer.label, href: text });
    } else {
      run.push(answer);
    }
  }
  flush();
  return blocks;
}

function linkParts(href: string): { host: string; rest: string } | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const rest = `${url.pathname === "/" ? "" : url.pathname}${url.search}`;
    return { host: url.hostname.replace(/^www\./, ""), rest };
  } catch {
    return null;
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-muted-foreground">{children}</span>;
}

function FactValue({ answer }: { answer: Answer }) {
  const { fieldType, unit } = answer.field;
  if (fieldType === "checkbox") {
    return answer.value ? (
      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
        <Check aria-hidden className="size-3.5" />
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <X aria-hidden className="size-3.5" />
        No
      </span>
    );
  }
  if (fieldType === "number") {
    return (
      <span className="text-[15px] font-semibold tabular-nums text-foreground">
        {asText(answer.value)}
        {unit ? <span className="ml-1 text-[13px] font-normal text-muted-foreground">{unit}</span> : null}
      </span>
    );
  }
  if (fieldType === "select") {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-fill-active px-2.5 text-xs font-medium text-foreground ring-1 ring-inset ring-line-strong">
        {asText(answer.value)}
      </span>
    );
  }
  return <span className="text-sm text-foreground">{asText(answer.value)}</span>;
}

const PANEL = "rounded-xl bg-fill-subtle ring-1 ring-inset ring-edge";

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{block.label}</Label>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
            {block.text}
          </p>
        </div>
      );
    case "link": {
      const parts = linkParts(block.href);
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{block.label}</Label>
          {parts ? (
            <a
              href={block.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 max-w-full items-center gap-2 self-start rounded-lg bg-fill-hover px-2.5 text-[13px] ring-1 ring-inset ring-edge transition-colors hover:bg-fill-active"
            >
              <Link2 aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="shrink-0 font-medium text-foreground">{parts.host}</span>
              {parts.rest ? (
                <span className="min-w-0 truncate text-muted-foreground">{parts.rest}</span>
              ) : null}
              <ExternalLink aria-hidden className="size-3 shrink-0 text-muted-foreground" />
            </a>
          ) : (
            <span className="text-sm break-all text-foreground">{block.href}</span>
          )}
        </div>
      );
    }
    case "figures": {
      const cols = block.items.length === 4 ? 2 : Math.min(block.items.length, 3);
      return (
        <div
          className={cn(PANEL, "grid overflow-hidden")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {block.items.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "flex min-w-0 flex-col gap-1 px-3.5 py-3",
                index % cols !== 0 && "border-l border-line",
                index >= cols && "border-t border-line",
              )}
            >
              <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
                {asText(item.value)}
                {item.field.unit ? (
                  <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
                    {item.field.unit}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "facts":
      return (
        <div className={cn(PANEL, "flex flex-col divide-y divide-line")}>
          {block.items.map((item) => (
            <div
              key={item.label}
              className="flex min-h-11 items-center justify-between gap-4 px-3.5 py-2"
            >
              <Label>{item.label}</Label>
              <span className="min-w-0 text-right">
                <FactValue answer={item} />
              </span>
            </div>
          ))}
        </div>
      );
  }
}

export function ReportFields({
  report,
  fields,
}: {
  report: DailyReport;
  /** Template fields, when the report's template is known. */
  fields?: TemplateField[];
}) {
  let answers: (Answer & { key: string })[] = [];

  if (fields && report.field_responses) {
    answers = [...fields]
      .sort((a, b) => a.fieldOrder - b.fieldOrder)
      .map((field) => ({
        key: field.key,
        label: field.label,
        field,
        value: fieldResponse(report.field_responses, field),
      }))
      .filter((answer) => isAnswered(answer.field.fieldType, answer.value));
  } else if (report.field_responses) {
    answers = Object.entries(report.field_responses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const fieldType: TemplateField["fieldType"] =
          typeof value === "number"
            ? "number"
            : typeof value === "boolean"
              ? "checkbox"
              : "text";
        return { key, label: humanise(key), field: { fieldType, unit: null }, value };
      })
      .filter((answer) => isAnswered(answer.field.fieldType, answer.value));
  } else {
    // Reports from before templates.
    answers = (
      [
        ["content", "Update", report.content],
        ["blockers", "Blockers", report.blockers],
        ["additional_notes", "Notes", report.additional_notes],
      ] as const
    )
      .map(([key, label, value]) => ({
        key,
        label,
        field: { fieldType: "textarea" as const, unit: null },
        value,
      }))
      .filter((answer) => isAnswered("textarea", answer.value));
  }

  const blocks = buildBlocks(answers);

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">No details in this report.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block) => (
        <BlockView key={`${block.kind}-${block.key}`} block={block} />
      ))}
    </div>
  );
}
