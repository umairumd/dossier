"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { ReportFields } from "@/components/reports/report-fields";
import {
  addReportComment,
  deleteReportComment,
  getReportComments,
} from "@/lib/actions/reports";
import { todayInTimezone } from "@/lib/helpers/dates";
import type { DailyReport, ReportComment } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { ReportTemplateWithFields } from "@/types/template";
import type { UserRole } from "@/types/profile";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

function formatModalSubmittedAt(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    weekday: "short",
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

  const activeReportId =
    showComments && current?.report?.id ? current.report.id : null;
  const [commentsByReport, setCommentsByReport] = useState<{
    reportId: string;
    comments: ReportComment[];
  } | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const comments =
    activeReportId && commentsByReport?.reportId === activeReportId
      ? commentsByReport.comments
      : [];
  const commentsLoading =
    Boolean(activeReportId) && commentsByReport?.reportId !== activeReportId;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? "⌘ Enter" : "Ctrl + Enter";

  useEffect(() => {
    if (!activeReportId) {
      return;
    }

    let cancelled = false;
    getReportComments(activeReportId)
      .then((data) => {
        if (!cancelled) {
          setCommentsByReport({ reportId: activeReportId, comments: data });
        }
      })
      .catch((err) => {
        console.error("getReportComments failed:", err);
        if (!cancelled) {
          setCommentsByReport({ reportId: activeReportId, comments: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeReportId]);

  async function handleSendComment() {
    if (!current?.report?.id || !commentBody.trim() || commentsReadOnly) return;
    setIsSending(true);
    const result = await addReportComment(current.report.id, commentBody);
    if (result.success) {
      setCommentBody("");
      const updated = await getReportComments(current.report.id);
      setCommentsByReport({
        reportId: current.report.id,
        comments: updated,
      });
    } else {
      toast.error(result.error ?? "Failed to send comment.");
    }
    setIsSending(false);
  }

  // Arrow keys move between reports (not while typing a comment).
  const open = index !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (index === null) return;
      const next = event.key === "ArrowLeft" ? index - 1 : index + 1;
      if (next < 0 || next >= members.length) return;
      event.preventDefault();
      onIndexChange(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, members.length, onIndexChange]);

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
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {index !== null && current && (
          <>
            <header className="flex shrink-0 flex-col gap-3 border-b border-edge px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  userId={current.employeeId}
                  name={current.fullName}
                  avatar={current.avatar}
                  size="lg"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <DialogTitle asChild>
                    <h2 className="truncate text-base font-semibold">
                      {showProfileLink ? (
                        <Link
                          href={`/employees/${current.employeeId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {current.fullName}
                        </Link>
                      ) : (
                        current.fullName
                      )}
                    </h2>
                  </DialogTitle>
                  {current.designation && (
                    <span className="truncate text-[13px] text-muted-foreground">
                      {current.designation}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {members.length > 1 && (
                    <>
                      <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">
                        {index + 1} of {members.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => onIndexChange(index - 1)}
                        aria-label="Previous report"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === members.length - 1}
                        onClick={() => onIndexChange(index + 1)}
                        aria-label="Next report"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                      <span aria-hidden className="mx-1.5 h-4 w-px bg-edge" />
                    </>
                  )}
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                      <XIcon className="size-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <DialogDescription asChild>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <SubmissionStatusBadge
                      status={getSubmissionStatus(
                        current.report.submitted_at,
                        deadline.deadlineHourUtc,
                        deadline,
                        undefined,
                        current.isOnLeave,
                      )}
                    />
                    <span>{formatModalSubmittedAt(current.report.submitted_at)}</span>
                    {templateForReport && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{shortTemplateName(templateForReport.name)}</span>
                      </>
                    )}
                  </div>
                </DialogDescription>
                {canEditOwnToday && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/reports?report=open">Edit report</Link>
                  </Button>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <ReportFields
                report={current.report}
                fields={templateForReport?.fields}
              />

              {showComments && (
                <section
                  aria-label="Comments"
                  className="mt-6 flex flex-col gap-3 border-t border-edge pt-5"
                >
                  <h3 className="flex items-center gap-2 text-[13px] font-medium">
                    Comments
                    {!commentsLoading && comments.length > 0 && (
                      <span className="tabular-nums text-muted-foreground">
                        {comments.length}
                      </span>
                    )}
                  </h3>
                  {commentsLoading && (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  )}
                  {!commentsLoading && comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                  {comments.map((c) => {
                    const authorName = c.profiles?.full_name ?? "Deleted user";
                    return (
                      <div key={c.id} className="group/comment flex gap-2.5">
                        <MemberAvatar
                          userId={c.profiles?.id ?? ""}
                          name={authorName}
                          avatar={c.profiles?.avatar}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-[13px] font-medium text-foreground">
                              {authorName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">
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
                                className="shrink-0 text-muted-foreground opacity-0 group-hover/comment:opacity-100 hover:text-destructive focus-visible:opacity-100"
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
                              if (!activeReportId) return;
                              setCommentsByReport((prev) => {
                                if (!prev || prev.reportId !== activeReportId) {
                                  return prev;
                                }
                                return {
                                  reportId: activeReportId,
                                  comments: prev.comments.filter(
                                    (item) => item.id !== c.id,
                                  ),
                                };
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </section>
              )}
            </div>

            {showComments && !commentsReadOnly && (
              <div className="shrink-0 border-t border-edge bg-fill-subtle px-4 py-3">
                <div className="flex items-end gap-2 rounded-xl bg-fill-hover p-1.5 pl-3 ring-1 ring-inset ring-edge focus-within:ring-ring/60">
                  <Textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleSendComment();
                      }
                    }}
                    placeholder="Add a comment…"
                    aria-label="Add a comment"
                    rows={1}
                    className="max-h-32 min-h-8 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
                    disabled={isSending}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    disabled={isSending || !commentBody.trim()}
                    onClick={() => void handleSendComment()}
                    aria-label={`Send comment (${shortcutLabel})`}
                    title={`Send (${shortcutLabel})`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
