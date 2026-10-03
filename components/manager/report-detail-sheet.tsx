"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Trash2,
  UserCircle,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { SubmitReportSheet } from "@/components/reports/submit-report-sheet";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { DynamicFieldRenderer } from "@/components/reports/dynamic-field-renderer";
import {
  addReportComment,
  deleteReportComment,
  getReportComments,
} from "@/lib/actions/reports";
import { todayInTimezone } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { DailyReport, ReportComment } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

function formatModalSubmittedAt(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortTemplateName(name: string): string {
  return name.endsWith(" Template") ? name.slice(0, -" Template".length) : name;
}

// Controlled by the parent (Team Reports page): index is a position into
// the *currently filtered/sorted* list of submitted reports, so
// Previous/Next cycles through exactly what the manager is looking at,
// not a separate unfiltered fetch.
export function ReportDetailSheet({
  members,
  index,
  onIndexChange,
  deadline,
  adminView = false,
  showProfileLink = true,
  templates,
  isOwnReport = false,
  viewerRole,
  currentUserId,
}: {
  members: SubmittedMember[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  deadline: DeadlineContext;
  adminView?: boolean;
  showProfileLink?: boolean;
  templates?: ReportTemplateWithFields[];
  isOwnReport?: boolean;
  viewerRole?: UserRole;
  currentUserId?: string;
}) {
  const router = useRouter();
  const current = index !== null ? members[index] : null;
  const templateForReport = current?.report.template_id
    ? templates?.find((template) => template.id === current.report.template_id)
    : null;
  const showComments = adminView || showProfileLink || isOwnReport;
  const commentsReadOnly = Boolean(isOwnReport && viewerRole === "member");
  const canModerateComments =
    viewerRole === "owner" || viewerRole === "admin";
  const canEditOwnToday = Boolean(
    isOwnReport &&
      current &&
      templateForReport &&
      current.report.report_date === todayInTimezone(deadline.timezone),
  );

  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? "⌘ Enter" : "Ctrl + Enter";

  useEffect(() => {
    if (!showComments || !current?.report?.id) {
      setComments([]);
      return;
    }

    let cancelled = false;
    setComments([]);
    setCommentsLoading(true);
    getReportComments(current.report.id)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setCommentsOpen(data.length > 0);
          setCommentsLoading(false);
        }
      })
      .catch((err) => {
        console.error("getReportComments failed:", err);
        if (!cancelled) {
          setCommentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [current?.report?.id, showComments]);

  async function handleSendComment() {
    if (!current?.report?.id || !commentBody.trim() || commentsReadOnly) return;
    setIsSending(true);
    const result = await addReportComment(current.report.id, commentBody);
    if (result.success) {
      setCommentBody("");
      const updated = await getReportComments(current.report.id);
      setComments(updated);
    } else {
      toast.error(result.error ?? "Failed to send comment.");
    }
    setIsSending(false);
  }

  function canDeleteComment(comment: ReportComment): boolean {
    if (commentsReadOnly || !currentUserId) return false;
    if (!comment.profiles) return canModerateComments;
    return comment.profiles.id === currentUserId || canModerateComments;
  }

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(next) => !next && onIndexChange(null)}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {index !== null && current && (
          <>
            <DialogHeader className="shrink-0 space-y-2 border-b p-4">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  userId={current.employeeId}
                  name={current.fullName}
                  avatarUrl={current.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <DialogTitle asChild>
                    <span className="font-semibold">{current.fullName}</span>
                  </DialogTitle>
                  <SubmissionStatusBadge
                    status={getSubmissionStatus(
                      current.report.submitted_at,
                      deadline.deadlineHourUtc,
                      deadline,
                      undefined,
                      current.isOnLeave,
                    )}
                  />
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Close"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </DialogClose>
              </div>

              <DialogDescription asChild>
                <div className="flex flex-wrap items-center text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3 shrink-0" aria-hidden />
                    {formatModalSubmittedAt(current.report.submitted_at)}
                  </span>
                  {templateForReport && (
                    <>
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3 shrink-0" aria-hidden />
                        Template: {shortTemplateName(templateForReport.name)}
                      </span>
                    </>
                  )}
                  {showProfileLink && (
                    <>
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      <Link
                        href={`/employees/${current.employeeId}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                      >
                        <UserCircle className="size-3 shrink-0" aria-hidden />
                        View Profile →
                      </Link>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogBody
              className={cn(
                "min-h-0 flex-1 overflow-y-auto px-4 pt-4",
                showComments ? "pb-0" : "pb-4",
              )}
            >
              <div className="-mx-4">
                {templateForReport && current.report.field_responses
                  ? [...templateForReport.fields]
                      .sort((a, b) => a.fieldOrder - b.fieldOrder)
                      .map((field) => (
                        <div
                          key={field.key}
                          className="border-b border-border px-4 py-4 first:pt-0 last:border-0 last:pb-0"
                        >
                          <DynamicFieldRenderer
                            field={field}
                            value={current.report.field_responses?.[field.key]}
                            mode="display"
                          />
                        </div>
                      ))
                  : current.report.field_responses
                    ? Object.entries(current.report.field_responses)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="border-b border-border px-4 py-4 first:pt-0 last:border-0 last:pb-0"
                          >
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {key.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-foreground">
                              {String(value) || "None reported"}
                            </p>
                          </div>
                        ))
                    : (
                      <p className="px-4 text-sm text-muted-foreground">
                        No report data available.
                      </p>
                    )}
              </div>

              {showComments && (
                <div className="-mx-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCommentsOpen((open) => !open)}
                    className="flex w-full items-center justify-between px-4 py-4 text-sm font-medium transition-colors hover:bg-foreground/5"
                  >
                    <span className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Comments</span>
                      {!commentsLoading && comments.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-medium tabular-nums">
                          {comments.length}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        commentsOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {commentsOpen ? (
                    <div className="flex flex-col gap-4 px-4 pb-4">
                      <div className="flex flex-col gap-3">
                        {commentsLoading && (
                          <p className="text-xs text-muted-foreground">
                            Loading…
                          </p>
                        )}
                        {!commentsLoading && comments.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No comments yet.
                          </p>
                        )}
                        {comments.map((c) => {
                          const authorName =
                            c.profiles?.full_name ?? "Deleted user";
                          const authorAvatar =
                            c.profiles?.avatar_url ?? undefined;
                          return (
                          <div key={c.id} className="flex gap-2.5">
                            <MemberAvatar
                              userId={c.profiles?.id ?? ""}
                              name={authorName}
                              avatarUrl={authorAvatar}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-xs font-medium text-foreground">
                                  {authorName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(
                                    new Date(c.created_at),
                                    { addSuffix: true },
                                  )}
                                </span>
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                                {c.body}
                              </p>
                            </div>
                            {canDeleteComment(c) && (
                              <ConfirmActionDialog
                                trigger={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                    aria-label="Delete comment"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                }
                                title="Delete comment?"
                                description="This comment will be permanently removed."
                                confirmLabel="Delete"
                                confirmVariant="destructive"
                                successMessage="Comment deleted."
                                errorMessage="Failed to delete comment."
                                action={() => deleteReportComment(c.id)}
                                onSuccess={() => {
                                  setComments((prev) =>
                                    prev.filter((item) => item.id !== c.id),
                                  );
                                }}
                              />
                            )}
                          </div>
                          );
                        })}
                      </div>

                      {!commentsReadOnly && (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                (e.metaKey || e.ctrlKey)
                              ) {
                                e.preventDefault();
                                void handleSendComment();
                              }
                            }}
                            placeholder="Add a comment…"
                            className="min-h-[60px] resize-none text-sm"
                            disabled={isSending}
                          />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">
                              {shortcutLabel} to send
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isSending || !commentBody.trim()}
                              onClick={() => void handleSendComment()}
                            >
                              {isSending ? "Sending…" : "Send"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </DialogBody>

            <DialogFooter className="!flex-row flex-row items-center justify-between gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                {canEditOwnToday && current && templateForReport ? (
                  <SubmitReportSheet
                    alreadySubmitted
                    initialReport={current.report}
                    triggerLabel="Edit Report"
                    triggerVariant="outline"
                    template={templateForReport}
                    onSubmitted={() => {
                      router.refresh();
                    }}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {index + 1} of {members.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === members.length - 1}
                onClick={() => onIndexChange(index + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
