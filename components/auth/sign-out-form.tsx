"use client";

import type { ReactNode } from "react";
import { logout } from "@/lib/actions/auth";

export const SIGN_IN_WAVE_KEY = "dossier-buddy-waved";

export function clearSignInWave() {
  try {
    sessionStorage.removeItem(SIGN_IN_WAVE_KEY);
  } catch {
    // Private mode: the next tab already has no flag.
  }
}

/** Clears the sign-in wave flag, then runs the logout server action. */
export function SignOutForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form action={logout} className={className} onSubmit={clearSignInWave}>
      {children}
    </form>
  );
}
