"use client";

import { useRef, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroViewHeader({
  title,
  meta,
  leading,
  onClose,
  panelRef,
}: {
  title: string;
  meta: ReactNode;
  leading?: ReactNode;
  onClose: (options?: { restoreFocus?: boolean }) => void;
  panelRef?: (node: HTMLDivElement | null) => void;
}) {
  const fromPointer = useRef(false);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={title}
      className="flex items-center justify-between gap-3 outline-none"
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className={cn("h-10 shrink-0 max-md:h-11")}
        onPointerDown={() => {
          fromPointer.current = true;
        }}
        onClick={() => {
          const pointer = fromPointer.current;
          fromPointer.current = false;
          onClose({ restoreFocus: !pointer });
        }}
      >
        <ChevronUp />
        Collapse
      </Button>
    </div>
  );
}
