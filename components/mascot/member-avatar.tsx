"use client";

/**
 * Drop-in replacement for components/shared/member-avatar.tsx.
 * Same props as before (+ `avatar`, `state`, `live`).
 *
 * - Everyone is shown as their buddy. `avatarUrl` is accepted and ignored.
 * - No saved avatar → defaultAvatar(userId): a stable shape + colour from the id.
 * - The layout box is the size token (plus className), matching the previous
 *   BotAvatar boxes. The still is drawn at that token's pixel size and scales
 *   with the box, so a responsive className cannot shift the row.
 * - `interactive` / `live` load the animated canvas. Everything else is a still.
 */
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { type Expression, type MascotState, sanitizeAvatar } from "@/lib/mascot";
import { cn } from "@/lib/utils";
import { MascotStatic } from "./mascot";

const LiveMascot = dynamic(
  () => import("./mascot").then((mod) => mod.Mascot),
  { ssr: false },
);

/** Legacy BotAvatar expressions → new expressions. */
export type BotExpression = "neutral" | "wink" | "wide" | "notification";
const LEGACY_EXPR: Record<BotExpression, Expression> = {
  neutral: "neutral", wink: "wink", wide: "wide", notification: "surprised",
};

export const AVATAR_SIZE_CLASS = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
  "2xl": "size-24",
  table: "h-8 w-8",
  card: "h-14 w-14",
  hero: "size-24",
} as const;

export const AVATAR_SIZE_PX = { xs: 20, sm: 28, md: 32, lg: 40, xl: 64, "2xl": 96, table: 32, card: 56, hero: 96 } as const;

export function MemberAvatar({
  name, userId, avatar, size = "md", className, expression, interactive, live, state,
}: {
  name: string;
  userId?: string;
  /**
   * @deprecated Ignored. Dossier has no profile photos — every person is shown as their buddy.
   * Kept only so a stray caller still compiles.
   */
  avatarUrl?: string | null;
  /** Raw profiles.avatar json (validated here). */
  avatar?: unknown;
  size?: keyof typeof AVATAR_SIZE_PX;
  className?: string;
  expression?: BotExpression;
  interactive?: boolean;
  /** Force the animated engine (default: only when interactive). */
  live?: boolean;
  state?: MascotState;
}) {
  const seed = userId ?? name;
  const cfg = useMemo(() => sanitizeAvatar(avatar, seed), [avatar, seed]);
  const px = AVATAR_SIZE_PX[size];
  const box = cn("relative inline-block shrink-0", AVATAR_SIZE_CLASS[size], className);

  if (interactive || live) {
    return (
      <span className={box}>
        <LiveMascot
          avatar={cfg}
          seed={seed}
          size={px}
          state={state}
          interactive={interactive}
          follow={interactive ? "region" : "none"}
          className="absolute inset-0"
          aria-label={name}
        />
      </span>
    );
  }

  return (
    <span className={box}>
      <MascotStatic
        avatar={cfg}
        size={px}
        state={state}
        expression={expression ? LEGACY_EXPR[expression] : undefined}
        fitParent
        alt={name}
      />
    </span>
  );
}
