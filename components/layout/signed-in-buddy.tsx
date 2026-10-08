"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultAvatar, sanitizeAvatar, type AvatarConfig } from "@/lib/mascot";

const FALLBACK_SEED = "dossier";

type SignedInBuddy = {
  userId: string;
  avatar: unknown;
};

const SignedInBuddyContext = createContext<SignedInBuddy | null>(null);

/** Makes the signed-in person's buddy available to the app error boundary. */
export function SignedInBuddyProvider({
  userId,
  avatar,
  children,
}: SignedInBuddy & { children: ReactNode }) {
  const value = useMemo(() => ({ userId, avatar }), [userId, avatar]);
  return (
    <SignedInBuddyContext.Provider value={value}>
      {children}
    </SignedInBuddyContext.Provider>
  );
}

/** The signed-in profile's id and saved avatar, when this tree has one. */
export function useSignedInBuddyIdentity(): SignedInBuddy | null {
  return useContext(SignedInBuddyContext);
}

/** Their saved buddy, or a stable default when this tree has no profile. */
export function useSignedInBuddy(): AvatarConfig {
  const ctx = useContext(SignedInBuddyContext);
  return useMemo(
    () => (ctx ? sanitizeAvatar(ctx.avatar, ctx.userId) : defaultAvatar(FALLBACK_SEED)),
    [ctx],
  );
}
