"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// One writing box for reports, tasks, comments and notices. Formatting shows
// as you write (bold, lists, checklists, links) and the text is saved as
// Markdown, so readers, link cards and exports keep working and older plain
// text opens unchanged (single line breaks are kept).
//
// Typing "- ", "1. " or "[ ] " starts a list; Cmd/Ctrl+B, I and K format;
// the toolbar appears while the box has focus and acts on the current line,
// so nothing has to be selected first.

type MarkdownStorage = { markdown?: { getMarkdown: () => string } };

function getMarkdown(editor: Editor): string {
  const storage = editor.storage as unknown as MarkdownStorage;
  return (storage.markdown?.getMarkdown() ?? editor.getText()).trim();
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground max-md:size-9 [&_svg]:size-3.5",
        active && "bg-fill-active text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />;
}

/** Applies a typed link to the selection, or inserts it when nothing is selected. */
function applyLink(editor: Editor, raw: string) {
  const url = raw.trim();
  if (!url) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return true;
  }
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (editor.state.selection.empty && !editor.isActive("link")) {
    editor
      .chain()
      .focus()
      .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
      .insertContent(" ")
      .run();
    return true;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  return true;
}

function LinkBar({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [url, setUrl] = useState((editor.getAttributes("link").href as string | undefined) ?? "");
  return (
    <form
      className="flex items-center gap-2 border-b border-line px-2 py-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        applyLink(editor, url);
        onDone();
      }}
    >
      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
            editor.commands.focus();
          }
        }}
        placeholder="Paste or type a link"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {editor.isActive("link") ? (
        <button
          type="button"
          onClick={() => {
            applyLink(editor, "");
            onDone();
          }}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-fill-hover hover:text-foreground"
        >
          Remove
        </button>
      ) : null}
      <button type="submit" className="rounded-md bg-fill-active px-2 py-1 text-xs font-medium hover:bg-fill-hover">
        Apply
      </button>
    </form>
  );
}

function Toolbar({ editor, onLink, dim }: { editor: Editor; onLink: () => void; dim?: boolean }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("code"),
      link: e.isActive("link"),
    }),
  });
  return (
    // Always takes its space so the box never jumps; it only fades in while
    // you write.
    <div
      className={cn(
        "flex items-center gap-0.5 overflow-x-auto border-b border-line px-1.5 py-1 transition-opacity duration-150 [scrollbar-width:none]",
        dim && "opacity-40",
      )}
    >
      <ToolButton label="Bold (Cmd+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Italic (Cmd+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough />
      </ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolButton>
      <ToolButton label="Checklist" active={state.task} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks />
      </ToolButton>
      <Divider />
      <ToolButton label="Link (Cmd+K)" active={state.link} onClick={onLink}>
        <Link2 />
      </ToolButton>
      <ToolButton label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </ToolButton>
      <ToolButton label="Code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code2 />
      </ToolButton>
    </div>
  );
}

export type RichEditorHandle = { clear: () => void; focus: () => void };

export function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 80,
  toolbar = "focus",
  autoFocus = false,
  invalid = false,
  onSubmit,
  handleRef,
  className,
  ariaLabel,
  variant = "box",
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** Height of the writing area in px, before it grows. */
  minHeight?: number;
  /** "focus": tools appear while writing. "always": always shown. */
  toolbar?: "focus" | "always" | "none";
  autoFocus?: boolean;
  invalid?: boolean;
  /** Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
  handleRef?: (handle: RichEditorHandle | null) => void;
  className?: string;
  ariaLabel?: string;
  /** "bare": no frame or toolbar, for a free-flowing area like a new task's
   * details. Formatting still works by typing and from the selection menu. */
  variant?: "box" | "bare";
}) {
  const [focused, setFocused] = useState(false);
  const [linking, setLinking] = useState(false);
  const lastEmitted = useRef(value);
  const submitRef = useRef(onSubmit);
  const changeRef = useRef(onChange);
  useEffect(() => {
    submitRef.current = onSubmit;
    changeRef.current = onChange;
  });

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ breaks: true, linkify: true, transformPastedText: true, tightLists: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-editor-content outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && submitRef.current) {
          event.preventDefault();
          submitRef.current();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (/^\s*file:\/\//i.test(text)) {
          toast.warning("That's a file on your computer, so nobody else can open it. Upload it to Drive and paste the share link instead.");
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const markdown = getMarkdown(e);
      lastEmitted.current = markdown;
      changeRef.current(markdown);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  // Outside changes (a reset after submit, a draft restored).
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !handleRef) return;
    handleRef({
      clear: () => {
        editor.commands.clearContent(true);
      },
      focus: () => editor.commands.focus("end"),
    });
    return () => handleRef(null);
  }, [editor, handleRef]);

  useEffect(() => {
    if (!editor) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && editor.isFocused) {
        event.preventDefault();
        setLinking(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const bare = variant === "bare";
  const showTools = Boolean(editor) && !bare && toolbar !== "none";
  const dimTools = toolbar === "focus" && !(focused || linking);

  return (
    <div
      className={cn(
        bare
          ? "bg-transparent"
          : "rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30",
        !bare && focused && "border-ring ring-[3px] ring-ring/50",
        invalid && "border-destructive ring-destructive/20",
        className,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) editor?.commands.focus("end");
      }}
    >
      {showTools && editor ? <Toolbar editor={editor} onLink={() => setLinking(true)} dim={dimTools} /> : null}
      {editor && linking ? <LinkBar editor={editor} onDone={() => setLinking(false)} /> : null}
      {editor ? (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: e, state }) => !state.selection.empty && e.isFocused && !e.isActive("codeBlock")}
          className="flex items-center gap-0.5 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-edge"
        >
          <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold />
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic />
          </ToolButton>
          <ToolButton label="Link" active={editor.isActive("link")} onClick={() => setLinking(true)}>
            <Link2 />
          </ToolButton>
          <ToolButton label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code2 />
          </ToolButton>
        </BubbleMenu>
      ) : null}
      <div
        className={cn("cursor-text text-sm leading-relaxed max-md:text-base", bare ? "py-1" : "px-3 py-2.5")}
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <p className="text-muted-foreground">{value || placeholder}</p>
        )}
      </div>
    </div>
  );
}
