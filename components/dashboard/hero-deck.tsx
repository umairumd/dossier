"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { cn } from "@/lib/utils";

function motionFallback(): boolean {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    typeof document.startViewTransition !== "function"
  );
}

/**
 * Swaps the tile grid for one open view.
 * View transitions morph the clicked tile when the browser supports them.
 * Otherwise the tiles fade out, the area height eases, and the view fades in.
 */
export function HeroDeck({
  panel,
  tiles,
  renderView,
}: {
  panel: HeroPanelId | null;
  tiles: ReactNode;
  renderView: (id: HeroPanelId) => ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);
  const [probed, setProbed] = useState(false);
  const [shown, setShown] = useState<HeroPanelId | null>(panel);
  const [phase, setPhase] = useState<"idle" | "out" | "resize" | "in">("idle");
  const [height, setHeight] = useState<number | null>(null);

  if (typeof window !== "undefined" && !probed) {
    setProbed(true);
    setAnimate(motionFallback());
  }

  if (!animate && shown !== panel) {
    setShown(panel);
  }
  if (animate && shown !== panel && phase === "idle") {
    setPhase("out");
  }

  useEffect(() => {
    if (phase !== "out") return;
    const lock = window.setTimeout(() => {
      const current = hostRef.current?.getBoundingClientRect().height;
      if (current) setHeight(current);
    }, 0);
    const fade = window.setTimeout(() => {
      setShown(panel);
      setPhase("resize");
    }, 150);
    return () => {
      window.clearTimeout(lock);
      window.clearTimeout(fade);
    };
  }, [phase, panel]);

  useEffect(() => {
    if (phase !== "resize") return;
    const frame = window.requestAnimationFrame(() => {
      const next = innerRef.current?.scrollHeight;
      if (next) setHeight(next);
    });
    const grow = window.setTimeout(() => setPhase("in"), 250);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(grow);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "in") return;
    const done = window.setTimeout(() => {
      setPhase("idle");
      setHeight(null);
    }, 150);
    return () => window.clearTimeout(done);
  }, [phase]);

  const moving = phase !== "idle";

  return (
    <div
      ref={hostRef}
      className={cn(
        "scroll-mt-16",
        moving && "overflow-hidden transition-[height] duration-[250ms] ease-[cubic-bezier(0.2,0,0,1)]",
      )}
      style={height != null ? { height } : undefined}
    >
      <div
        ref={innerRef}
        className={cn(
          "origin-top",
          (phase === "out" || phase === "in") &&
            "transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
          (phase === "out" || phase === "resize") && "scale-[0.98] opacity-0",
          phase === "in" && "scale-100 opacity-100",
        )}
      >
        {shown ? renderView(shown) : tiles}
      </div>
    </div>
  );
}
