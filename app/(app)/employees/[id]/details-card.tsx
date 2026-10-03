import { formatDistanceToNow } from "date-fns";
import { RoleChip } from "@/components/shared/role-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/helpers/dates";
import type { UserRole } from "@/types/profile";

export function DetailsCard({
  employee,
  showAdminFields = true,
}: {
  employee: {
    email?: string | null;
    role: UserRole;
    employment_type: "full_time" | "part_time";
    is_remote: boolean;
    created_at: string;
    date_of_birth?: string | null;
    last_seen_at: string | null;
    last_sign_in_at?: string | null;
  };
  // Email comes from the service-role auth API and birthdays are
  // admin-only, so both stay hidden for team viewers.
  showAdminFields?: boolean;
}) {
  return (
    <Card className="card-gradient h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {showAdminFields && (
          <div className="flex flex-col gap-1">
            <p className="label-eyebrow">Email</p>
            <p className="break-all text-sm font-medium">
              {employee.email ?? "—"}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Role</p>
          <RoleChip role={employee.role} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Employment</p>
          <p className="text-sm font-medium">
            {employee.employment_type === "part_time"
              ? "Part-time"
              : "Full-time"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Work Location</p>
          <p className="text-sm font-medium">
            {employee.is_remote ? "Remote" : "On-site"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Member Since</p>
          <p className="text-sm font-medium">
            {formatDate(employee.created_at.slice(0, 10))}
          </p>
        </div>
        {showAdminFields && employee.date_of_birth && (
          <div className="flex flex-col gap-1">
            <p className="label-eyebrow">Date of Birth</p>
            <p className="text-sm font-medium">
              {formatDate(employee.date_of_birth)}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="label-eyebrow">Last Seen</p>
          <p className="text-sm font-medium">
            {(() => {
              const lastSeen =
                employee.last_seen_at ?? employee.last_sign_in_at;
              return lastSeen
                ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true })
                : "Never";
            })()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
