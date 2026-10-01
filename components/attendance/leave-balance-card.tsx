"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adjustLeaveBalance,
  initLeaveBalanceAction,
} from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { LeaveBalance } from "@/types/attendance";

export function LeaveBalanceCard({
  balance,
  profileId,
  orgId,
  joinDate,
  canAdjust = false,
}: {
  balance: LeaveBalance | null;
  profileId: string;
  orgId: string;
  joinDate: string;
  canAdjust?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");

  const handleInitialize = () => {
    startTransition(async () => {
      const result = await initLeaveBalanceAction(profileId, orgId, joinDate);
      if (!result.success) {
        toast.error(result.error ?? "Failed to initialize leave balance.");
        return;
      }
      toast.success("Leave balance initialized.");
    });
  };

  const parsedDays = Number(days);
  const canSubmit =
    !isPending &&
    note.trim().length >= 10 &&
    Number.isFinite(parsedDays) &&
    parsedDays !== 0;

  const handleAdjust = () => {
    if (!canSubmit) {
      if (note.trim().length < 10) {
        toast.error("A reason is required (at least 10 characters).");
      } else {
        toast.error("Enter a non-zero number of days.");
      }
      return;
    }

    startTransition(async () => {
      const result = await adjustLeaveBalance(profileId, parsedDays, note);
      if (!result.success) {
        toast.error(result.error ?? "Failed to adjust leave balance.");
        return;
      }
      toast.success(
        parsedDays > 0
          ? `Added ${parsedDays} day${parsedDays === 1 ? "" : "s"}.`
          : `Subtracted ${Math.abs(parsedDays)} day${Math.abs(parsedDays) === 1 ? "" : "s"}.`,
      );
      setDays("");
      setNote("");
      setOpen(false);
    });
  };

  if (!balance) {
    return (
      <Card className="card-gradient-subtle">
        <CardHeader className="pb-3">
          <CardDescription>Leave Balance</CardDescription>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Not initialized
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleInitialize}
            disabled={isPending || !orgId}
          >
            {isPending ? "Initializing..." : "Initialize"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const accrued = Number(balance.total_accrued);
  const used = Number(balance.total_used);
  const remaining = balance.balance_remaining ?? accrued - used;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Leave Balance</p>
        {canAdjust && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setOpen(true)}
          >
            Adjust
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 divide-x divide-border">
        <div className="flex flex-col justify-center pr-4">
          <p className="text-xs text-muted-foreground">Contract Period</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {formatDate(balance.contract_year_start)} →{" "}
            {formatDate(balance.contract_year_end)}
          </p>
        </div>
        <div className="flex flex-col items-center px-4">
          <p className="text-2xl font-semibold">{accrued}</p>
          <p className="mt-1 text-xs text-muted-foreground">Accrued</p>
        </div>
        <div className="flex flex-col items-center px-4">
          <p className="text-2xl font-semibold">{used}</p>
          <p className="mt-1 text-xs text-muted-foreground">Used</p>
        </div>
        <div className="flex flex-col items-center pl-4">
          <p
            className={cn(
              "text-2xl font-semibold",
              remaining < 0 && "text-destructive",
            )}
          >
            {remaining}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Remaining</p>
        </div>
      </div>

      {canAdjust && (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setNote("");
              setDays("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Leave Balance</DialogTitle>
              <DialogDescription>
                This adjustment will be logged with your name and reason.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leave-adjustment-days">Adjustment (days)</Label>
                <Input
                  id="leave-adjustment-days"
                  type="number"
                  step="0.5"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  placeholder="e.g. 2 or -1"
                />
                <p className="text-xs text-muted-foreground">
                  Use a negative number to deduct days.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leave-adjustment-note">Reason</Label>
                <Textarea
                  id="leave-adjustment-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why is this balance being adjusted?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters. This is stored for audit purposes.
                </p>
              </div>
            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNote("");
                    setDays("");
                  }}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={handleAdjust}
              >
                {isPending ? "Saving..." : "Save Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
