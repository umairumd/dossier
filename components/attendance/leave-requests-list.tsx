"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { reviewLeaveRequestAction } from "@/lib/actions/admin/attendance";
import { LEAVE_REQUEST_TYPE_LABELS } from "@/types/attendance";
import type { LeaveRequestWithEmployee } from "@/types/attendance";
import { formatDate } from "@/lib/helpers/dates";

function LeaveRequestRow({
  request,
}: {
  request: LeaveRequestWithEmployee;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "approved" | "rejected") => {
    startTransition(async () => {
      const result = await reviewLeaveRequestAction(request.id, action);
      if (!result.success) {
        toast.error(result.error ?? "Failed to process request.");
        return;
      }
      toast.success(
        action === "approved" ? "Leave approved." : "Leave rejected.",
      );
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <MemberAvatar
          name={request.full_name}
          userId={request.profile_id}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{request.full_name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(request.date)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {LEAVE_REQUEST_TYPE_LABELS[request.type]}
            </span>
            {request.notes && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="max-w-48 truncate text-xs text-muted-foreground italic">
                  &ldquo;{request.notes}&rdquo;
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => handleAction("rejected")}
          disabled={isPending}
        >
          <X className="size-3" />
          Reject
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => handleAction("approved")}
          disabled={isPending}
        >
          <Check className="size-3" />
          Approve
        </Button>
      </div>
    </div>
  );
}

export function LeaveRequestsList({
  requests,
}: {
  requests: LeaveRequestWithEmployee[];
}) {
  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No pending leave requests.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {requests.map((request) => (
        <LeaveRequestRow key={request.id} request={request} />
      ))}
    </div>
  );
}
