"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { List, ListOrdered } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// A textarea that helps people write one item per line, which is how the
// report reader shows answers: Enter continues a "1." or "-" list, Enter on an
// empty item ends it, and two buttons turn the selected lines into a list.
// Edits go through insertText so the browser's undo still works.

const NUMBERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const BULLET = /^(\s*)[-*•]\s+(.*)$/;

function fit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  const style = getComputedStyle(el);
  const line = Number.parseFloat(style.lineHeight) || 20;
  const pad =
    Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const border =
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth);
  const min = line * 3 + pad + border;
  const max = line * 12 + pad + border;
  const next = Math.min(max, Math.max(min, el.scrollHeight));
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > max + 1 ? "auto" : "hidden";
}

/** Replace [start, end) with text, keeping undo; falls back to a plain set. */
function replaceRange(el: HTMLTextAreaElement, start: number, end: number, text: string) {
  el.focus();
  el.setSelectionRange(start, end);
  const ok =
    typeof document.execCommand === "function" &&
    (text === ""
      ? start === end || document.execCommand("delete", false)
      : document.execCommand("insertText", false, text));
  if (!ok) {
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function lineBounds(value: string, start: number, end: number) {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end > start && value[end - 1] === "\n" ? end - 1 : end);
  return { from, to: nextBreak === -1 ? value.length : nextBreak };
}

export function ListTextarea({
  value,
  onChange,
  placeholder,
  invalid,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) fit(ref.current);
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    const el = event.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const caret = el.selectionStart;
    const from = el.value.lastIndexOf("\n", caret - 1) + 1;
    const line = el.value.slice(from, caret);

    const numbered = line.match(NUMBERED);
    const bullet = numbered ? null : line.match(BULLET);
    if (!numbered && !bullet) return;
    event.preventDefault();

    const rest = numbered ? numbered[3] : bullet![2];
    if (!rest.trim()) {
      // Enter on an empty item ends the list.
      replaceRange(el, from, caret, "");
      return;
    }
    const indent = (numbered ?? bullet)![1];
    const marker = numbered ? `${Number(numbered[2]) + 1}. ` : "- ";
    replaceRange(el, caret, caret, `\n${indent}${marker}`);
  }

  function toggleList(kind: "bullet" | "number") {
    const el = ref.current;
    if (!el) return;
    const { from, to } = lineBounds(el.value, el.selectionStart, el.selectionEnd);
    const lines = el.value.slice(from, to).split("\n");
    const pattern = kind === "number" ? NUMBERED : BULLET;
    const allOn = lines.filter((line) => line.trim()).every((line) => pattern.test(line));
    let n = 0;
    const next = lines
      .map((line) => {
        const body = line.replace(NUMBERED, "$1$3").replace(BULLET, "$1$2");
        if (allOn) return body;
        if (!body.trim()) return body;
        n += 1;
        const indent = body.match(/^\s*/)?.[0] ?? "";
        return `${indent}${kind === "number" ? `${n}.` : "-"} ${body.trimStart()}`;
      })
      .join("\n");
    const text = from === to && !allOn ? `${kind === "number" ? "1." : "-"} ` : next;
    replaceRange(el, from, to, text);
  }

  /** "3.Zeus" after a numbered line becomes "3. Zeus". */
  function tidy() {
    if (!onChange) return;
    const lines = value.split("\n");
    let changed = false;
    const tidied = lines.map((line, index) => {
      const fixed = line.match(/^(\s*)(\d{1,3})[.)](\S.*)$/);
      if (fixed && index > 0 && NUMBERED.test(lines[index - 1])) {
        changed = true;
        return `${fixed[1]}${fixed[2]}. ${fixed[3]}`;
      }
      return line;
    });
    if (changed) onChange(tidied.join("\n"));
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive ring-destructive/20",
        className,
      )}
    >
      <Textarea
        ref={ref}
        value={value}
        rows={3}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className="field-sizing-fixed min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        onKeyDown={onKeyDown}
        onBlur={tidy}
        onChange={(event) => {
          fit(event.currentTarget);
          onChange?.(event.target.value);
        }}
      />
      <div className="flex items-center gap-1 border-t border-edge px-1.5 py-1">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggleList("bullet")}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground max-md:h-9"
        >
          <List className="size-3.5" />
          Bullets
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggleList("number")}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground max-md:h-9"
        >
          <ListOrdered className="size-3.5" />
          Numbers
        </button>
        <span className="ml-auto truncate px-1 text-xs text-muted-foreground max-sm:hidden">
          One item per line. Paste links on their own line.
        </span>
      </div>
    </div>
  );
}
