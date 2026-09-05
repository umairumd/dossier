import { Camera } from "lucide-react";
import {
  PartTimeIndicator,
  RemoteIndicator,
} from "@/components/shared/employee-indicators";
import { MemberAvatar } from "@/components/shared/member-avatar";

export function ProfileHeader({
  name,
  designation,
  departmentNames,
  isRemote,
  employmentType,
  avatarUrl,
  size = "md",
  showUploadButton = false,
}: {
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
  employmentType?: "full_time" | "part_time";
  avatarUrl?: string | null;
  size?: "sm" | "md";
  showUploadButton?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
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

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold">{name}</h2>
          {isRemote && <RemoteIndicator />}
          {employmentType === "part_time" && <PartTimeIndicator />}
        </div>
        {designation && (
          <p className="text-sm text-muted-foreground">{designation}</p>
        )}
        {departmentNames && departmentNames.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {departmentNames.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
