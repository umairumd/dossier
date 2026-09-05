import { Camera } from "lucide-react";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";

const outlinedPillClassName =
  "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground";

const filledPillClassName =
  "inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background";

export function ProfileHeader({
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatarUrl,
  size = "md",
  showUploadButton = false,
  roleLabel,
  joinedLabel,
}: {
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatarUrl?: string | null;
  size?: "sm" | "md";
  showUploadButton?: boolean;
  roleLabel?: string;
  joinedLabel?: string;
}) {
  const showDetailPills = Boolean(roleLabel);

  return (
    <div className="flex w-full items-center gap-4 py-2">
      <div className="relative">
        <MemberAvatar
          name={name}
          avatarUrl={avatarUrl ?? undefined}
          size={size === "sm" ? "md" : "lg"}
        />
        {showUploadButton && (
          <button
            type="button"
            disabled
            className="absolute -right-1 -bottom-1 flex size-6 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted text-muted-foreground opacity-50"
            title="Photo upload coming soon"
          >
            <Camera className="size-3" />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold">{name}</h2>
          {showDetailPills && roleLabel && (
            <span className={outlinedPillClassName}>{roleLabel}</span>
          )}
          {!showDetailPills && isRemote && <RemoteIndicator />}
          {!showDetailPills && employmentType === "part_time" && (
            <PartTimeIndicator />
          )}
        </div>
        {showDetailPills ? (
          <div className="flex flex-wrap items-center gap-2">
            {designation && (
              <span className={filledPillClassName}>{designation}</span>
            )}
            {departmentNames?.map((department) => (
              <span key={department} className={filledPillClassName}>
                {department}
              </span>
            ))}
            {employmentType && (
              <span className={filledPillClassName}>
                {employmentType === "part_time" ? "Part-time" : "Full-time"}
              </span>
            )}
            {joinedLabel && (
              <span className="ml-auto text-xs text-muted-foreground">
                {joinedLabel}
              </span>
            )}
          </div>
        ) : (
          <>
            {designation && (
              <p className="text-sm text-muted-foreground">{designation}</p>
            )}
            {departmentNames && departmentNames.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {departmentNames.join(", ")}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
