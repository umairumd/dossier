import { LeaveBalanceCard } from "@/components/attendance/leave-balance-card";
import type { LeaveBalance } from "@/types/attendance";

/** Home leave summary. Renders nothing when the ledger has no active row. */
export function HomeLeaveBalance({
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
  if (!balance) return null;

  return (
    <div className="rise-in">
      <LeaveBalanceCard
        balance={balance}
        profileId={profileId}
        orgId={orgId}
        joinDate={joinDate}
        canAdjust={false}
      />
    </div>
  );
}
