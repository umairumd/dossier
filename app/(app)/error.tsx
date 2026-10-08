"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { BuddyStatus } from "@/components/status/buddy-status";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <BuddyStatus
      expression="spiral"
      title="Your buddy got a little dizzy"
      body="Something went wrong loading this page. It's not you."
    >
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="max-md:min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-w-28"
          onClick={reset}
        >
          Try again
        </Button>
        <Button
          variant="outline"
          className="max-md:min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-w-28"
          asChild
        >
          <Link href="/">Go to dashboard</Link>
        </Button>
      </div>
      {error.digest ? <ErrorId digest={error.digest} /> : null}
    </BuddyStatus>
  );
}

function ErrorId({ digest }: { digest: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 flex max-w-full items-center justify-center gap-1 text-xs text-muted-foreground">
      <p className="min-w-0 truncate">
        Error ID: <span className="font-mono">{digest}</span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground max-md:size-11 motion-reduce:transition-none motion-reduce:active:scale-100"
        aria-label={copied ? "Copied" : "Copy error ID"}
        onClick={copy}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
