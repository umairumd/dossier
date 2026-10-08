"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Height + fade transition for hero panels.
 * - Children stay mounted while closing, so the collapse animates instead of jumping.
 * - Overflow is clipped only while animating or closed, so focus rings on
 *   edge fields are not cut off once the panel is open.
 */
export function HeroPanelMotion({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [animating, setAnimating] = useState(false);

  // Adjust state while rendering when `open` changes (no effect needed).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setAnimating(!prefersReducedMotion());
  }

  const mounted = open || animating;

  return (
    <div
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) setAnimating(false);
      }}
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div
        inert={!open}
        className={cn(
          "min-h-0 transition-opacity duration-200 motion-reduce:transition-none",
          (animating || !open) && "overflow-hidden",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {mounted ? children : null}
      </div>
    </div>
  );
}
