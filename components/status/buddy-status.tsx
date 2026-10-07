"use client";

import type { ReactNode } from "react";
import { MascotStatic } from "@/components/mascot/mascot";
import { useSignedInBuddy } from "@/components/layout/signed-in-buddy";
import type { Expression } from "@/lib/mascot";

export function BuddyStatus({
  expression,
  title,
  body,
  children,
}: {
  expression: Expression;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const avatar = useSignedInBuddy();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-1 py-16 motion-reduce:transition-none">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <MascotStatic avatar={avatar} size={120} expression={expression} alt="" />
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-balance text-muted-foreground">{body}</p>
        {children}
      </div>
    </div>
  );
}
