"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CalendarClock, CircleCheckBig, Pin, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  HandbookAudiencePicker,
  type PickerPerson,
} from "@/components/admin/handbook-audience-picker";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { RichEditor } from "@/components/shared/rich-editor";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { AssigneePicker, PropertyChip } from "@/components/tasks/task-pickers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { postNotice } from "@/lib/actions/notices";
import { audienceLabel, matchesHandbookAudience } from "@/lib/handbook/audience";
import { shiftReportDate } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { HandbookAudience } from "@/types/handbook";
import type { NoticeKind } from "@/types/notice";

export type ComposeData = {
  canAnnounce: boolean;
  canSendPersonal: boolean;
  /** Managers and supervisors: departments they manage, people in their team. */
  restricted: boolean;
  departments: { id: string; name: string }[];
  people: PickerPerson[];
  personalTargets: PickerPerson[];
  designations: string[];
};

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A chip that opens a small list of dates, with "none" at the bottom. */
function DateChip({
  icon,
  emptyLabel,
  setLabel,
  value,
  onChange,
  today,
  options,
}: {
  icon: React.ReactNode;
  emptyLabel: string;
  setLabel: (date: string) => string;
  value: string;
  onChange: (value: string) => void;
  today: string;
  options: { label: string; days: number }[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <PropertyChip icon={icon} muted={!value}>
          {value ? setLabel(value) : emptyLabel}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="start">
        {options.map((option) => {
          const date = shiftReportDate(today, option.days);
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(date)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover"
            >
              {option.label}
              <span className="text-xs text-muted-foreground">{shortDate(date)}</span>
            </button>
          );
        })}
        <div className="my-1 h-px bg-line" />
        <input
          type="date"
          min={today}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Pick a date"
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm [color-scheme:dark]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-fill-hover"
          >
            {emptyLabel}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Post an announcement to a group, or a personal notice to one person.
 * Same shape as New task: a title, a message, then one row of chips.
 */
export function ComposeNoticeDialog({
  open,
  onOpenChange,
  data,
  today,
  initialKind,
  initialTargetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ComposeData;
  today: string;
  initialKind?: NoticeKind;
  initialTargetId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<NoticeKind>(initialKind ?? (data.canAnnounce ? "announcement" : "personal"));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [audiences, setAudiences] = useState<HandbookAudience[]>(
    data.restricted
      ? data.departments.length === 1
        ? [{ kind: "department", value: data.departments[0].id }]
        : []
      : [{ kind: "everyone", value: null }],
  );
  const [targetId, setTargetId] = useState(initialTargetId ?? "");
  const [requiresAck, setRequiresAck] = useState(false);
  const [pinnedUntil, setPinnedUntil] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notify, setNotify] = useState(true);

  const personal = kind === "personal";
  const reach = useMemo(
    () =>
      data.people.filter((person) => matchesHandbookAudience(person, { kind: "policy", jdDesignation: null, audiences })).length,
    [data.people, audiences],
  );
  const lookups = {
    departmentNames: new Map(data.departments.map((dept) => [dept.id, dept.name])),
    personNames: new Map(data.people.map((person) => [person.id, person.full_name])),
  };
  const audienceSummary =
    audiences.length === 0 ? "Choose who sees it" : audiences.map((rule) => audienceLabel(rule, lookups)).join(", ");
  const target = data.personalTargets.find((person) => person.id === targetId) ?? null;
  const canSubmit = Boolean(title.trim()) && (personal ? Boolean(targetId) : audiences.length > 0) && !pending;

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await postNotice({
        kind,
        title,
        bodyMd: body,
        audiences,
        targetProfileId: personal ? targetId || null : null,
        requiresAck,
        pinnedUntil: pinnedUntil || null,
        endsAt: endsAt || null,
        notify,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        personal
          ? "Notice sent. You'll be told when they acknowledge it."
          : `Posted to ${result.reached} ${result.reached === 1 ? "person" : "people"}.`,
      );
      setTitle("");
      setBody("");
      setEditorKey((key) => key + 1);
      setPinnedUntil("");
      setEndsAt("");
      setRequiresAck(false);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          {data.canAnnounce && data.canSendPersonal ? (
            <SegmentedFilter
              label="Type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "announcement", label: "Announcement" },
                { value: "personal", label: "Personal notice" },
              ]}
            />
          ) : (
            <p className="text-[13px] font-medium text-muted-foreground">{personal ? "Personal notice" : "New announcement"}</p>
          )}
          <DialogTitle className="sr-only">{personal ? "Personal notice" : "New announcement"}</DialogTitle>
          <DialogDescription className="sr-only">Write the notice, then choose who sees it.</DialogDescription>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto px-5 pt-4 pb-4">
          <input
            autoFocus
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
            placeholder={personal ? "About your timings this month" : "Office closed Friday Nov 7"}
            aria-label="Title"
            className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/70"
          />
          <RichEditor
            key={editorKey}
            value={body}
            onChange={setBody}
            placeholder="Write the message…"
            minHeight={88}
            onSubmit={submit}
            variant="bare"
            ariaLabel="Message"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {personal ? (
              <AssigneePicker
                people={data.personalTargets.map((person) => ({
                  id: person.id,
                  name: person.full_name,
                  avatar: null,
                  designation: person.designation,
                }))}
                selected={targetId ? [targetId] : []}
                onToggle={(id) => setTargetId(id === targetId ? "" : id)}
                viewerId=""
                trigger={
                  <PropertyChip icon={target ? undefined : <UserRound />} muted={!target}>
                    {target ? (
                      <>
                        <MemberAvatar name={target.full_name} userId={target.id} avatar={null} size="xs" />
                        {target.full_name}
                      </>
                    ) : (
                      "Choose a person"
                    )}
                  </PropertyChip>
                }
              />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <PropertyChip icon={<Users />} muted={audiences.length === 0}>
                    <span className="max-w-64 truncate">{audienceSummary}</span>
                    {audiences.length ? <span className="text-muted-foreground tabular-nums">· {reach}</span> : null}
                  </PropertyChip>
                </PopoverTrigger>
                <PopoverContent align="start" className="flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3 p-3">
                  <p className="text-sm font-medium">Who sees it</p>
                  <HandbookAudiencePicker
                    value={audiences}
                    onChange={setAudiences}
                    departments={data.departments}
                    people={data.people}
                    designations={data.designations}
                    allow={data.restricted ? ["department"] : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    {reach} {reach === 1 ? "person" : "people"}
                    {data.restricted ? ". You can post to the departments you manage." : ""}
                  </p>
                </PopoverContent>
              </Popover>
            )}

            {!personal ? (
              <>
                <PropertyChip
                  icon={<CircleCheckBig />}
                  muted={!requiresAck}
                  aria-pressed={requiresAck}
                  onClick={() => setRequiresAck((value) => !value)}
                  title="People tap “I understand” instead of dismissing it"
                  className={cn(requiresAck && "ring-foreground/25")}
                >
                  {requiresAck ? "Must acknowledge" : "Acknowledge"}
                </PropertyChip>
                <DateChip
                  icon={<Pin />}
                  emptyLabel="Not pinned"
                  setLabel={(date) => `Pinned to ${shortDate(date)}`}
                  value={pinnedUntil}
                  onChange={setPinnedUntil}
                  today={today}
                  options={[
                    { label: "For 3 days", days: 3 },
                    { label: "For a week", days: 7 },
                    { label: "For two weeks", days: 14 },
                  ]}
                />
                <DateChip
                  icon={<CalendarClock />}
                  emptyLabel="On Home until read"
                  setLabel={(date) => `On Home until ${shortDate(date)}`}
                  value={endsAt}
                  onChange={setEndsAt}
                  today={today}
                  options={[
                    { label: "Today only", days: 0 },
                    { label: "Until tomorrow", days: 1 },
                    { label: "For a week", days: 7 },
                  ]}
                />
                <PropertyChip
                  icon={notify ? <Bell /> : <BellOff />}
                  muted={!notify}
                  aria-pressed={notify}
                  onClick={() => setNotify((value) => !value)}
                  title="Also send a notification"
                >
                  {notify ? "Notify" : "No notification"}
                </PropertyChip>
              </>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {personal
              ? "Shows at the top of their Home until they tap “I understand”. Only they, their managers and owners and admins can see it."
              : requiresAck
                ? "Shows in For you on Home until each person taps “I understand”. You can see who has."
                : "Shows in For you on Home until each person dismisses it, and stays on this page."}
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          <span className="ml-auto text-xs text-muted-foreground max-sm:hidden">Cmd+Enter to post</span>
          <Button onClick={submit} disabled={!canSubmit} className="max-sm:ml-auto">
            {pending ? "Posting…" : personal ? "Send" : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
