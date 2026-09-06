"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initLeaveBalanceAction } from "@/lib/actions/admin/attendance";
import { formatDate } from "@/lib/helpers/dates";
import type { LeaveBalance } from "@/types/attendance";

export function LeaveBalanceCard({
  balance,
  profileId,
  orgId,
  joinDate,
}: {
  balance: LeaveBalance | null;
  profileId: string;
  orgId: string;
  joinDate: string;
}) {
  const [isPending, startTransition] = useTransition();

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

  if (!balance) {
    return (
      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            No leave balance initialized
          </p>
          <Button
            type="button"
            size="sm"
            className="self-start"
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
  const remaining =
    balance.balance_remaining ?? Math.max(0, accrued - used);
  const ratio = accrued > 0 ? Math.min(100, (used / accrued) * 100) : 0;

  return (
    <Card className="card-gradient">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Leave Balance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <p className="label-eyebrow">Accrued</p>
            <p className="text-2xl font-semibold tracking-tight">{accrued}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label-eyebrow">Used</p>
            <p className="text-2xl font-semibold tracking-tight">{used}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label-eyebrow">Remaining</p>
            <p className="text-2xl font-semibold tracking-tight">{remaining}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${ratio}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {used} of {accrued} days used
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Contract Year</p>
          <p className="text-sm font-medium">
            {formatDate(balance.contract_year_start)} →{" "}
            {formatDate(balance.contract_year_end)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
