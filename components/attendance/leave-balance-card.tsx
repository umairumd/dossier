"use client";

import { useState, useTransition } from "react";
import { CalendarRange, ChevronDown, Scale } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleHeader } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adjustLeaveBalance,
  initLeaveBalanceAction,
  previewContractStartChangeAction,
  updateContractStartAction,
  type ContractStartPreview,
} from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import {
  computeLeaveBalanceBarMath,
  type LeaveBarSegment,
  type LeaveBalanceBarMath,
} from "@/lib/helpers/leave-balance";
import { cn } from "@/lib/utils";
import type { LeaveBalanceAdjustment } from "@/lib/supabase/queries/attendance";
import type { LeaveBalance } from "@/types/attendance";

const BAR_COLORS: Record<Exclude<LeaveBarSegment, "empty">, string> = {
  available: "#5EC2A4",
  taken: "#E8A35B",
  removed: "#F08A8A",
  over: "#F08A8A",
};

function formatContractYearPill(start: string, end: string): string {
  const a = new Date(`${start.slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${end.slice(0, 10)}T12:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(a)} – ${fmt(b)}`;
}

function formatArriveOn(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatYearEnd(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatFigure(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

function SnapshotRow({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-right">
        {before}
        <span className="mx-1.5 text-muted-foreground">→</span>
        {after}
      </span>
    </div>
  );
}

function segmentStyle(segment: LeaveBarSegment): string | undefined {
  if (segment === "empty") return undefined;
  if (segment === "removed") {
    const color = BAR_COLORS.removed;
    return `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 4px), color-mix(in oklab, ${color} 35%, transparent)`;
  }
  return BAR_COLORS[segment];
}

function LeaveDaySquare({
  left,
  right,
}: {
  left: LeaveBarSegment;
  right: LeaveBarSegment;
}) {
  return (
    <div className="flex h-3.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-muted ring-1 ring-inset ring-edge">
      <span
        className="h-full w-1/2"
        style={{ background: segmentStyle(left) }}
      />
      <span
        className="h-full w-1/2"
        style={{ background: segmentStyle(right) }}
      />
    </div>
  );
}

function LegendItem({
  color,
  striped,
  value,
  label,
}: {
  color: string;
  striped?: boolean;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/5 dark:ring-white/10"
        style={{
          background: striped
            ? `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 4px), ${color}33`
            : color,
        }}
      />
      <span className="font-semibold tabular-nums">{formatFigure(value)}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function subLine(math: LeaveBalanceBarMath): string {
  if (math.over > 0 && math.nextAccrualDate) {
    return `Back to ${formatFigure(math.remaining + 2)} when 2 more arrive on ${formatArriveOn(math.nextAccrualDate)}`;
  }
  if (math.nextAccrualDate) {
    return `2 more arrive on ${formatArriveOn(math.nextAccrualDate)}`;
  }
  return `Year ends ${formatYearEnd(math.yearEnd)}`;
}

function ariaSummary(math: LeaveBalanceBarMath): string {
  const parts = [
    `${formatFigure(math.available)} available`,
    `${formatFigure(math.taken)} taken`,
  ];
  if (math.removed > 0) parts.push(`${formatFigure(math.removed)} removed`);
  if (math.added > 0) parts.push(`${formatFigure(math.added)} added`);
  if (math.over > 0) {
    parts.push(
      `${formatFigure(math.over)} borrowed from ${math.nextMonthLabel}`,
    );
  }
  parts.push(`${formatFigure(math.stillToCome)} still to come`);
  return `Leave balance: ${parts.join(", ")}`;
}

export function LeaveBalanceCard({
  balance,
  profileId,
  orgId,
  contractStart,
  adjustments = [],
  canAdjust = false,
  canEditContractStart = false,
}: {
  balance: LeaveBalance | null;
  profileId: string;
  orgId: string;
  /** profiles.contract_start (YYYY-MM-DD, 1st of month). */
  contractStart: string;
  /** Recent manual changes, newest first. */
  adjustments?: LeaveBalanceAdjustment[];
  canAdjust?: boolean;
  canEditContractStart?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(contractStart.slice(0, 7));
  const [preview, setPreview] = useState<ContractStartPreview | null>(null);

  const canManage = canAdjust || canEditContractStart;

  const handleInitialize = () => {
    startTransition(async () => {
      const result = await initLeaveBalanceAction(
        profileId,
        orgId,
        contractStart,
      );
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

  const handlePreviewContractStart = () => {
    startTransition(async () => {
      const result = await previewContractStartChangeAction(
        profileId,
        monthValue,
      );
      if (!result.success) {
        toast.error(result.error ?? "Could not preview contract start.");
        return;
      }
      setPreview(result.preview);
      setEditOpen(false);
      setConfirmOpen(true);
    });
  };

  const handleConfirmContractStart = () => {
    startTransition(async () => {
      const result = await updateContractStartAction(profileId, monthValue);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update contract start.");
        return;
      }
      toast.success("Contract start updated.");
      setConfirmOpen(false);
      setPreview(null);
    });
  };

  const openContractEdit = () => {
    setMonthValue(contractStart.slice(0, 7));
    setEditOpen(true);
  };

  if (!balance) {
    return (
      <Card>
        <CardTitleHeader
          title="Leave balance"
          aside={
            canManage ? (
              <ManageMenu
                showAdjust={false}
                onAdjust={() => setOpen(true)}
                onContract={openContractEdit}
              />
            ) : undefined
          }
        />
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Not initialized yet.</p>
          {canAdjust && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleInitialize}
              disabled={isPending || !orgId}
            >
              {isPending ? "Initializing..." : "Initialize"}
            </Button>
          )}
        </CardContent>
        <ContractStartDialogs
          editOpen={editOpen}
          setEditOpen={setEditOpen}
          confirmOpen={confirmOpen}
          setConfirmOpen={setConfirmOpen}
          monthValue={monthValue}
          setMonthValue={setMonthValue}
          preview={preview}
          setPreview={setPreview}
          isPending={isPending}
          onPreview={handlePreviewContractStart}
          onConfirm={handleConfirmContractStart}
        />
      </Card>
    );
  }

  const math = computeLeaveBalanceBarMath({
    contractYearStart: balance.contract_year_start,
    contractYearEnd: balance.contract_year_end,
    totalAccrued: Number(balance.total_accrued),
    totalUsed: Number(balance.total_used),
  });
  const overdrawn = math.remaining < 0;
  const heroValue = overdrawn
    ? formatFigure(Math.abs(math.remaining))
    : formatFigure(math.available);

  return (
    <Card>
      <CardTitleHeader
        title="Leave balance"
        aside={
          <div className="flex items-center gap-1.5">
            <Badge variant="neutral" className="font-normal tabular-nums">
              {formatContractYearPill(
                balance.contract_year_start,
                balance.contract_year_end,
              )}
            </Badge>
            {canManage && (
              <ManageMenu
                showAdjust={canAdjust}
                onAdjust={() => setOpen(true)}
                onContract={openContractEdit}
              />
            )}
          </div>
        }
      />
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p
              className={cn(
                "text-4xl font-semibold tracking-tight tabular-nums",
                overdrawn && "text-destructive",
              )}
            >
              {heroValue}
            </p>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                overdrawn && "text-destructive",
              )}
            >
              {overdrawn ? "days over" : "days available"}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {subLine(math)}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:max-w-[14rem] sm:justify-end">
            <LegendItem
              color={BAR_COLORS.available}
              value={math.available}
              label="available"
            />
            {math.taken > 0 && (
              <LegendItem
                color={BAR_COLORS.taken}
                value={math.taken}
                label="taken"
              />
            )}
            {math.removed > 0 && (
              <LegendItem
                color={BAR_COLORS.removed}
                striped
                value={math.removed}
                label="removed"
              />
            )}
            {math.added > 0 && (
              <LegendItem
                color={BAR_COLORS.available}
                value={math.added}
                label="added"
              />
            )}
            {math.over > 0 && (
              <LegendItem
                color={BAR_COLORS.over}
                value={math.over}
                label={`borrowed from ${math.nextMonthLabel}`}
              />
            )}
            <LegendItem
              color="var(--muted)"
              value={math.stillToCome}
              label="still to come"
            />
          </div>
        </div>

        <div
          role="img"
          aria-label={ariaSummary(math)}
          className="flex flex-col gap-1.5"
        >
          <div
            className="grid grid-cols-12 gap-x-1.5"
            style={{ columnGap: "0.375rem" }}
          >
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const a = math.squares[monthIndex * 2];
              const b = math.squares[monthIndex * 2 + 1];
              return (
                <div
                  key={monthIndex}
                  className="flex min-w-0 gap-0.5"
                >
                  <LeaveDaySquare left={a.left} right={a.right} />
                  <LeaveDaySquare left={b.left} right={b.right} />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-x-1.5">
            {math.monthLabels.map((label, index) => {
              const isCurrent = index === math.currentMonthIndex;
              const keepOnNarrow =
                index === 0 ||
                index === math.currentMonthIndex ||
                index === 11;
              return (
                <span
                  key={`${label}-${index}`}
                  className={cn(
                    "text-center text-[10px] tabular-nums text-muted-foreground",
                    isCurrent && "font-bold text-foreground",
                    !keepOnNarrow && "max-[479px]:invisible",
                  )}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {adjustments.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="field-label">Changes this year</p>
            <ul className="flex flex-col divide-y divide-line">
              {adjustments.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm break-words">{item.note}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.adjusted_by_name ?? "Admin"} ·{" "}
                      {formatDate(item.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      item.adjustment > 0 ? "text-ok" : "text-destructive",
                    )}
                  >
                    {item.adjustment > 0 ? "+" : ""}
                    {item.adjustment}{" "}
                    {Math.abs(item.adjustment) === 1 ? "day" : "days"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <Label htmlFor="leave-adjustment-days">
                    Adjustment (days)
                  </Label>
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

        <ContractStartDialogs
          editOpen={editOpen}
          setEditOpen={setEditOpen}
          confirmOpen={confirmOpen}
          setConfirmOpen={setConfirmOpen}
          monthValue={monthValue}
          setMonthValue={setMonthValue}
          preview={preview}
          setPreview={setPreview}
          isPending={isPending}
          onPreview={handlePreviewContractStart}
          onConfirm={handleConfirmContractStart}
        />
      </CardContent>
    </Card>
  );
}

function ManageMenu({
  showAdjust,
  onAdjust,
  onContract,
}: {
  showAdjust: boolean;
  onAdjust: () => void;
  onContract: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2"
        >
          Manage
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {showAdjust && (
          <DropdownMenuItem
            className="items-start gap-2.5 py-2"
            onSelect={onAdjust}
          >
            <Scale className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Add or remove days</span>
              <span className="text-xs text-muted-foreground whitespace-normal">
                Correct the balance, for example leave taken before Dossier.
                Needs a reason; the employee is told.
              </span>
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="items-start gap-2.5 py-2"
          onSelect={onContract}
        >
          <CalendarRange className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">Change contract month</span>
            <span className="text-xs text-muted-foreground whitespace-normal">
              The month their leave year starts. This year&apos;s balance is
              recalculated; you&apos;ll see before and after first.
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContractStartDialogs({
  editOpen,
  setEditOpen,
  confirmOpen,
  setConfirmOpen,
  monthValue,
  setMonthValue,
  preview,
  setPreview,
  isPending,
  onPreview,
  onConfirm,
}: {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  monthValue: string;
  setMonthValue: (value: string) => void;
  preview: ContractStartPreview | null;
  setPreview: (preview: ContractStartPreview | null) => void;
  isPending: boolean;
  onPreview: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit contract start</DialogTitle>
            <DialogDescription>
              Month and year of the leave-contract anniversary. Always stored as
              the 1st of that month.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-start-month">Contract start</Label>
              <Input
                id="contract-start-month"
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={isPending || !/^\d{4}-\d{2}$/.test(monthValue)}
              onClick={onPreview}
            >
              {isPending ? "Checking..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) setPreview(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm contract start</DialogTitle>
            <DialogDescription>
              Active leave window and totals will be recomputed. Accrual claim
              rows are not changed.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {preview && (
              <div className="flex flex-col gap-2">
                <SnapshotRow
                  label="Window"
                  before={
                    preview.before
                      ? `${formatDate(preview.before.windowStart)} – ${formatDate(preview.before.windowEnd)}`
                      : "—"
                  }
                  after={`${formatDate(preview.after.windowStart)} – ${formatDate(preview.after.windowEnd)}`}
                />
                <SnapshotRow
                  label="Accrued"
                  before={String(preview.before?.accrued ?? "—")}
                  after={String(preview.after.accrued)}
                />
                <SnapshotRow
                  label="Used"
                  before={String(preview.before?.used ?? "—")}
                  after={String(preview.after.used)}
                />
                <SnapshotRow
                  label="Remaining"
                  before={String(preview.before?.remaining ?? "—")}
                  after={String(preview.after.remaining)}
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setEditOpen(true);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={isPending || !preview}
              onClick={onConfirm}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
