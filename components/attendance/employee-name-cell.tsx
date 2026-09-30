"use client";

import Link from "next/link";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function EmployeeNameCell({
  id,
  fullName,
  designation,
  departmentName,
  employmentType,
  isRemote,
  avatarUrl,
  profileBasePath,
}: {
  id: string;
  fullName: string;
  designation: string | null;
  departmentName: string | null;
  employmentType: "full_time" | "part_time";
  isRemote: boolean;
  avatarUrl: string | null;
  profileBasePath: string;
}) {
  return (
    <td className="sticky left-0 z-20 min-w-36 bg-card px-3 py-2 md:min-w-48 md:px-4">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MemberAvatar
              name={fullName}
              userId={id}
              avatarUrl={avatarUrl ?? undefined}
              size="sm"
            />
            <p className="min-w-0 truncate text-xs font-medium text-foreground">
              {fullName}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <MemberAvatar
                name={fullName}
                userId={id}
                avatarUrl={avatarUrl ?? undefined}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {fullName}
                </p>
                {designation && (
                  <p className="truncate text-xs text-muted-foreground">
                    {designation}
                  </p>
                )}
                {departmentName && (
                  <p className="truncate text-xs text-muted-foreground">
                    {departmentName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {employmentType === "full_time" ? "Full Time" : "Part Time"}
              </Badge>
              {isRemote && (
                <Badge variant="outline" className="text-[10px]">
                  Remote
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`${profileBasePath}/${id}`}>View Profile</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
}
