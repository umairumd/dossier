import { Camera } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";

export function ProfileHeader({
  name,
  designation,
  departmentNames,
  isRemote,
  avatarUrl,
  size = "md",
  showUploadButton = false,
}: {
  name: string;
  designation?: string | null;
  departmentNames?: string[];
  isRemote?: boolean;
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
        <h2 className="text-lg font-semibold">{name}</h2>
        {designation && (
          <p className="text-sm text-muted-foreground">{designation}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {departmentNames && departmentNames.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {departmentNames.join(", ")}
            </span>
          )}
          {isRemote && (
            <Badge variant="outline" className="text-xs">
              Remote
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
