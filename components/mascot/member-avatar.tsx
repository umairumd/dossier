"use client";

/**
 * Drop-in replacement for components/shared/member-avatar.tsx.
 * Same props as before (+ `avatar`, `state`, `live`), so the 23 existing call
 * sites keep working. Replace the body of shared/member-avatar.tsx with a
 * re-export of this file (see HANDOFF.md step 3).
 *
 * - Everyone is shown as their buddy (no profile photos). `avatarUrl` is accepted but ignored.
 * - No saved avatar → defaultAvatar(userId): a stable shape + colour picked from the id.
 * - Small sizes render a cached static frame; `interactive`/`live` renders the
 *   animated engine (hero, user menu).
 */
import { useMemo } from "react";
import { type Expression, type MascotState, sanitizeAvatar } from "@/lib/mascot";
import { Mascot, MascotStatic } from "./mascot";

/** Legacy BotAvatar expressions → new expressions. */
export type BotExpression = "neutral" | "wink" | "wide" | "notification";
const LEGACY_EXPR: Record<BotExpression, Expression> = {
  neutral: "neutral", wink: "wink", wide: "wide", notification: "surprised",
};

const SIZE_PX = { xs: 20, sm: 28, md: 32, lg: 40, xl: 64, "2xl": 96, table: 32, card: 56, hero: 96 } as const;

export function MemberAvatar({
  name, userId, avatar, size = "md", className, expression, interactive, live, state,
}: {
  name: string;
  userId?: string;
  /**
   * @deprecated Ignored. Dossier has no profile photos — every person is shown as their buddy.
   * Kept only so existing call sites compile; remove it from callers during the port.
   */
  avatarUrl?: string | null;
  /** Raw profiles.avatar json (validated here). */
  avatar?: unknown;
  size?: keyof typeof SIZE_PX;
  className?: string;
  expression?: BotExpression;
  interactive?: boolean;
  /** Force the animated engine (default: only when interactive). */
  live?: boolean;
  state?: MascotState;
}) {
  const seed = userId ?? name;
  const cfg = useMemo(() => sanitizeAvatar(avatar, seed), [avatar, seed]);
  const px = SIZE_PX[size];

  if (interactive || live) {
    return (
      <Mascot
        avatar={cfg}
        seed={seed}
        size={px}
        state={state}
        interactive={interactive}
        follow={interactive ? "region" : "none"}
        className={className}
        aria-label={name}
      />
    );
  }

  return (
    <MascotStatic
      avatar={cfg}
      size={px}
      state={state}
      expression={expression ? LEGACY_EXPR[expression] : undefined}
      className={className}
      alt={name}
    />
  );
}
