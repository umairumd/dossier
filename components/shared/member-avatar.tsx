import Image from "next/image";
import { BotAvatar, type BotExpression } from "@/components/shared/bot-avatar";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-16 w-16 text-base",
  "2xl": "size-24",
} as const;

const SIZE_PX = {
  xs: 20,
  sm: 28,
  md: 32,
  lg: 40,
  xl: 64,
  "2xl": 96,
} as const;

export function MemberAvatar({
  name,
  userId,
  avatarUrl,
  size = "md",
  className,
  expression,
}: {
  name: string;
  userId?: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  expression?: BotExpression;
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

  return (
    <BotAvatar
      userId={userId ?? name}
      size={px}
      className={className}
      expression={expression}
    />
  );
}
