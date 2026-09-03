import Image from "next/image";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-500" },
  { bg: "bg-violet-500/20", text: "text-violet-500" },
  { bg: "bg-rose-500/20", text: "text-rose-500" },
  { bg: "bg-amber-500/20", text: "text-amber-500" },
  { bg: "bg-emerald-500/20", text: "text-emerald-500" },
  { bg: "bg-cyan-500/20", text: "text-cyan-500" },
  { bg: "bg-orange-500/20", text: "text-orange-500" },
  { bg: "bg-pink-500/20", text: "text-pink-500" },
];

const SIZE_CLASS = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

const SIZE_PX = {
  xs: 20,
  sm: 28,
  md: 32,
  lg: 40,
} as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function colorForName(name: string) {
  let hash = 0;
  for (const char of name) {
    hash += char.charCodeAt(0);
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function MemberAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = SIZE_CLASS[size];
  const px = SIZE_PX[size];

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  const color = colorForName(name);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        sizeClass,
        color.bg,
        color.text,
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
