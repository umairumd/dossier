"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, HelpCircle, MoreHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HandbookAudiencePicker,
  type PickerPerson,
} from "@/components/admin/handbook-audience-picker";
import { MarkdownBody } from "@/components/handbook/markdown-body";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { Field } from "@/components/shared/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveHandbookDoc,
  countHandbookAudience,
  publishHandbookDoc,
  saveHandbookDraft,
  type HandbookDraftInput,
} from "@/lib/actions/admin/handbook";
import { normaliseAudiences } from "@/lib/handbook/audience";
import {
  HANDBOOK_KINDS,
  HANDBOOK_KIND_LABELS,
  docStatus,
} from "@/lib/handbook/format";
import type { HandbookAudience, HandbookDoc, HandbookKind } from "@/types/handbook";

type Draft = Omit<HandbookDraftInput, "id">;

const FORMATTING_HELP: [string, string][] = [
  ["## Heading", "Section heading"],
  ["### Heading", "Smaller heading"],
  ["**bold**", "Bold text"],
  ["*italic*", "Italic text"],
  ["- item", "Bullet list"],
  ["1. item", "Numbered list"],
  ["> note", "Highlighted note"],
  ["[text](https://…)", "Link"],
  ["| a | b |", "Table"],
];

function initialDraft(doc?: HandbookDoc): Draft {
  return {
    title: doc?.title ?? "",
    kind: doc?.kind ?? "policy",
    summary: doc?.summary ?? "",
    draftMd: doc?.draftMd ?? "",
    jdDesignation: doc?.jdDesignation ?? "",
    requiresAck: doc?.requiresAck ?? false,
    startHere: doc?.startHere ?? false,
    audiences: doc ? normaliseAudiences(doc.audiences) : [{ kind: "everyone", value: null }],
  };
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

export function HandbookEditor({
  doc,
  departments,
  people,
  designations,
  initialCount,
  aside,
}: {
  doc?: HandbookDoc;
  departments: { id: string; name: string }[];
  people: PickerPerson[];
  designations: string[];
  initialCount: number;
  /** Read progress, rendered on the server. */
  aside?: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(doc));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialDraft(doc)),
  );
  const [count, setCount] = useState<number | null>(initialCount);
  const [saving, startSaving] = useTransition();
  const [publishOpen, setPublishOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archive = () => {
    if (!doc) return;
    startSaving(async () => {
      const result = await archiveHandbookDoc(doc.id);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't archive the document.");
        return;
      }
      toast.success("Document archived.");
      router.push("/organization/handbook");
    });
  };
  const [view, setView] = useState<"write" | "split" | "preview">(
    doc && doc.version > 0 ? "split" : "write",
  );

  const changeKind = (kind: HandbookKind) =>
    setDraft((current) => {
      let audiences = current.audiences;
      if (kind === "jd" && audiences.length === 1 && audiences[0].kind === "everyone") {
        audiences = [];
      } else if (kind !== "jd" && audiences.length === 0) {
        audiences = [{ kind: "everyone", value: null }];
      }
      return {
        ...current,
        kind,
        audiences,
        jdDesignation: kind === "jd" ? current.jdDesignation : "",
      };
    });

  const snapshot = JSON.stringify(draft);
  const dirty = snapshot !== savedSnapshot;
  const version = doc?.version ?? 0;
  const status = doc
    ? docStatus({ ...doc, draftMd: draft.draftMd })
    : { label: "Draft", variant: "neutral" as const };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const audienceKey = JSON.stringify([draft.kind, draft.jdDesignation, draft.audiences]);
  const firstCount = useRef(true);
  useEffect(() => {
    if (firstCount.current) {
      firstCount.current = false;
      return;
    }
    let cancelled = false;
    const [kind, jdDesignation, audiences] = JSON.parse(audienceKey) as [
      HandbookKind,
      string,
      HandbookAudience[],
    ];
    const timer = window.setTimeout(async () => {
      try {
        const result = await countHandbookAudience({ kind, jdDesignation, audiences });
        if (!cancelled) setCount(result.count);
      } catch {
        if (!cancelled) setCount(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [audienceKey]);

  const validate = (): boolean => {
    if (!draft.title.trim()) {
      toast.error("Give the document a title.");
      return false;
    }
    return true;
  };

  const save = () => {
    if (!validate()) return;
    startSaving(async () => {
      const result = await saveHandbookDraft({ id: doc?.id, ...draft });
      if (!result.success) {
        toast.error(result.error ?? "Couldn't save the draft.");
        return;
      }
      toast.success("Draft saved.");
      setSavedSnapshot(snapshot);
      if (!doc && result.id) {
        router.replace(`/organization/handbook/${result.id}`);
      } else {
        router.refresh();
      }
    });
  };

  const openPublish = () => {
    if (!validate()) return;
    if (!draft.draftMd.trim()) {
      toast.error("Write something before publishing.");
      return;
    }
    setChangeNote("");
    setPublishOpen(true);
  };

  const publish = () => {
    if (version > 0 && !changeNote.trim()) {
      toast.error("Say what changed in this version.");
      return;
    }
    startSaving(async () => {
      const result = await publishHandbookDoc({ id: doc?.id, ...draft, changeNote });
      if (!result.success) {
        toast.error(result.error ?? "Couldn't publish.");
        return;
      }
      setPublishOpen(false);
      setSavedSnapshot(snapshot);
      toast.success(
        result.launched === false
          ? `Published v${result.version}. People will be told when you launch the handbook.`
          : `Published v${result.version}. ${result.notified ?? 0} ${result.notified === 1 ? "person was" : "people were"} notified.`,
      );
      if (!doc && result.id) {
        router.replace(`/organization/handbook/${result.id}`);
      } else {
        router.refresh();
      }
    });
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 500_000) {
      toast.error("That file is too large.");
      return;
    }
    const text = await file.text();
    setDraft((current) => {
      const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
      return {
        ...current,
        draftMd: text,
        title: current.title.trim() ? current.title : (heading ?? current.title),
      };
    });
    toast.success(`Imported ${file.name}.`);
  };

  const countLabel =
    count === null
      ? "Couldn't count who can see this."
      : `${count} ${count === 1 ? "person" : "people"} can see this`;

  const kindPicker = (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1.5">
      {HANDBOOK_KINDS.map((kind) => {
        const on = draft.kind === kind;
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => changeKind(kind)}
            className={
              "flex h-9 items-center justify-center rounded-lg text-[13px] font-medium ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 " +
              (on
                ? "bg-fill-active text-foreground ring-foreground/25"
                : "text-muted-foreground ring-edge hover:bg-fill-hover hover:text-foreground")
            }
          >
            {HANDBOOK_KIND_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={status.variant}>{status.label}</Badge>
          {doc ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem variant="destructive" onSelect={() => setArchiveOpen(true)}>
                  <Archive className="size-4" />
                  Archive document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <label htmlFor="handbook-title" className="sr-only">
          Title
        </label>
        <input
          id="handbook-title"
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder={doc ? "Untitled document" : "Document title"}
          maxLength={160}
          className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-[28px]"
        />
        <label htmlFor="handbook-summary" className="sr-only">
          Summary
        </label>
        <input
          id="handbook-summary"
          value={draft.summary}
          onChange={(event) => set("summary", event.target.value)}
          placeholder="Add a one-line summary (optional)"
          maxLength={300}
          className="w-full bg-transparent text-[15px] text-muted-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="min-w-0">
          <CardTitleHeader
            title="Content"
            aside={
              <div className="flex items-center gap-2">
                <SegmentedFilter
                  label="Editor view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "write", label: "Write" },
                    { value: "split", label: "Split" },
                    { value: "preview", label: "Preview" },
                  ]}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Formatting help">
                      <HelpCircle className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <p className="border-b border-line px-4 py-3 text-sm font-medium">Formatting</p>
                    <dl className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                      {FORMATTING_HELP.map(([syntax, result]) => (
                        <div key={syntax} className="flex items-center justify-between gap-4">
                          <dt className="font-mono text-xs text-muted-foreground">{syntax}</dt>
                          <dd>{result}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="border-t border-line px-4 py-3 text-xs text-muted-foreground">
                      In an SOP, a numbered list shows as steps. Pasting from Notion keeps this
                      formatting.
                    </p>
                  </PopoverContent>
                </Popover>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(event) => {
                    void importFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload className="size-3.5" />
                  <span className="hidden sm:inline">Import .md</span>
                </Button>
              </div>
            }
          />
          <CardContent className="flex flex-col gap-3">
            <div
              className={
                view === "split"
                  ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                  : "grid grid-cols-1 gap-4"
              }
            >
              {view !== "preview" ? (
                <Textarea
                  id="handbook-body"
                  aria-label="Content in Markdown"
                  value={draft.draftMd}
                  onChange={(event) => set("draftMd", event.target.value)}
                  placeholder={
                    draft.kind === "sop"
                      ? "## When to use this\n\nOne line on when this applies.\n\n## Steps\n\n1. First step\n   Details on the next line.\n2. Second step"
                      : "## Section heading\n\nWrite here. Paste from Notion, or import a .md file."
                  }
                  spellCheck
                  className="min-h-[34rem] resize-y font-mono text-[13px] leading-6 [field-sizing:fixed] md:text-[13px]"
                />
              ) : null}
              {view !== "write" ? (
                <div
                  className={
                    "min-h-[34rem] overflow-y-auto rounded-lg p-5 ring-1 ring-inset ring-edge " +
                    (view === "split" ? "bg-fill-subtle lg:max-h-[48rem]" : "")
                  }
                >
                  {draft.draftMd.trim() ? (
                    <MarkdownBody markdown={draft.draftMd} steps={draft.kind === "sop"} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                  )}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4">
          <Card>
            <CardTitleHeader title="Type" />
            <CardContent className="flex flex-col gap-3">
              {kindPicker}
              {draft.kind === "jd" ? (
                <Field
                  label="Designation"
                  htmlFor="handbook-designation"
                  hint="People with this designation see it under Your role."
                >
                  <Input
                    id="handbook-designation"
                    list="handbook-designations"
                    value={draft.jdDesignation}
                    onChange={(event) => set("jdDesignation", event.target.value)}
                    placeholder="e.g. Graphic Designer"
                  />
                  <datalist id="handbook-designations">
                    {designations.map((designation) => (
                      <option key={designation} value={designation} />
                    ))}
                  </datalist>
                </Field>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardTitleHeader title="Who can see this" />
            <CardContent className="flex flex-col gap-3">
              <HandbookAudiencePicker
                value={draft.audiences}
                onChange={(audiences) => set("audiences", audiences)}
                departments={departments}
                people={people}
                designations={designations}
              />
              {draft.audiences.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  {draft.kind === "jd" && draft.jdDesignation.trim()
                    ? `With no one added, people whose designation is ${draft.jdDesignation.trim()} can see it.`
                    : "No one added yet: only owners and admins can open it."}
                </p>
              ) : null}
              <p aria-live="polite" className="text-[13px] font-medium tabular-nums">
                {countLabel}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardTitleHeader title="Reading" />
            <CardContent className="flex flex-col gap-4">
              <ToggleRow
                id="handbook-requires-ack"
                label="Ask people to confirm"
                hint="They tick “I've read and understood this”. Each new version asks again."
                checked={draft.requiresAck}
                onChange={(value) => set("requiresAck", value)}
              />
              <ToggleRow
                id="handbook-start-here"
                label="Add to Start here"
                hint="Shows in the new joiner checklist at the top of the handbook."
                checked={draft.startHere}
                onChange={(value) => set("startHere", value)}
              />
            </CardContent>
          </Card>

          {aside}

        </div>
      </div>

      <div className="sticky bottom-4 z-10">
        <div className="surface-overlay flex items-center justify-end gap-2 rounded-xl bg-popover px-4 py-3">
          <span className="mr-auto text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : version > 0 ? `Readers see v${version}` : "Not published yet"}
          </span>
          <Button type="button" variant="outline" onClick={save} disabled={saving || (!dirty && !!doc)}>
            {saving && !publishOpen ? "Saving…" : "Save draft"}
          </Button>
          <Button type="button" onClick={openPublish} disabled={saving}>
            Publish
          </Button>
        </div>
      </div>

      {doc ? (
        <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this document?</AlertDialogTitle>
              <AlertDialogDescription>
                {doc.title} will leave the handbook for everyone. Read confirmations are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={archive}>
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish version {version + 1}</DialogTitle>
            <DialogDescription>
              {count === null
                ? "Everyone who can see it will be notified."
                : `${count} ${count === 1 ? "person" : "people"} will be notified.`}
              {draft.requiresAck ? " They'll be asked to confirm they've read it." : ""}
            </DialogDescription>
          </DialogHeader>
          <Field
            label={version > 0 ? "What changed" : "Note (optional)"}
            htmlFor="handbook-change-note"
            hint={version > 0 ? "Shown to readers who read an earlier version." : undefined}
          >
            <Textarea
              id="handbook-change-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder={version > 0 ? "e.g. Sick leave can now be requested the same day." : ""}
              maxLength={500}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPublishOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={publish}
              disabled={saving || (version > 0 && !changeNote.trim())}
            >
              {saving ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
