"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface BotAvatarProps {
  userId: string;
  size?: number;
  className?: string;
  interactive?: boolean;
}

const PALETTES = [
  { light: "#a8d8ff", mid: "#5ba3e8", dark: "#1a5ca8" },
  { light: "#c8b8ff", mid: "#8b72e8", dark: "#4230b0" },
  { light: "#90ecd0", mid: "#3dbf9a", dark: "#107858" },
  { light: "#ffb8d0", mid: "#e8729e", dark: "#a82858" },
  { light: "#ffd890", mid: "#e8b030", dark: "#9a5e08" },
  { light: "#b0c4d8", mid: "#7890a8", dark: "#385878" },
] as const;

const ACTIVE_SHAPES = ["circle"] as const;

const SHAPES = {
  circle: {
    clip: <circle cx="100" cy="100" r="88" />,
    eyes: [
      { cx: 76, cy: 96, rot: -12 },
      { cx: 124, cy: 86, rot: -12 },
    ],
    grad: { cx: "34%", cy: "26%" },
  },
  hexagon: {
    clip: (
      <path d="M39.9,32.5 Q50.2,13.0 72.2,13.0 L127.8,13.0 Q149.8,13.0 160.1,32.5 L183.8,77.5 Q194.0,97.0 183.8,116.5 L160.1,161.5 Q149.8,181.0 127.8,181.0 L72.2,181.0 Q50.2,181.0 39.9,161.5 L16.2,116.5 Q6.0,97.0 16.2,77.5 Z" />
    ),
    eyes: [
      { cx: 76, cy: 100, rot: -12 },
      { cx: 124, cy: 90, rot: -12 },
    ],
    grad: { cx: "34%", cy: "26%" },
  },
} as const;

const EYE_W = 19;
const EYE_H = 40;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function BotAvatar({
  userId,
  size = 32,
  className,
  interactive,
}: BotAvatarProps) {
  const isInteractive = interactive ?? true;
  const uid = useId().replace(/:/g, "");
  const gradId = `bot-grad-${uid}`;
  const clipId = `bot-clip-${uid}`;

  const hash = hashString(userId);
  const shapeKey = ACTIVE_SHAPES[hash % ACTIVE_SHAPES.length];
  const palette = PALETTES[(hash >> 4) % PALETTES.length];
  const shape = SHAPES[shapeKey];
  const { eyes, grad } = shape;

  const svgRef = useRef<SVGSVGElement>(null);
  const leftEyeRef = useRef<SVGRectElement>(null);
  const rightEyeRef = useRef<SVGRectElement>(null);
  const mxRef = useRef(0);
  const myRef = useRef(0);
  const blinkScaleRef = useRef(1);
  const rafRef = useRef<number>(0);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyEyes = () => {
      const dx = mxRef.current * 11;
      const dy = myRef.current * 10;
      const h = Math.max(1.5, EYE_H * blinkScaleRef.current);
      const ry = Math.min(EYE_W / 2, h / 2);

      const updateEye = (
        el: SVGRectElement | null,
        eye: { cx: number; cy: number; rot: number },
      ) => {
        el?.setAttribute(
          "transform",
          `translate(${eye.cx + dx},${eye.cy + dy}) rotate(${eye.rot})`,
        );
        el?.setAttribute("height", String(h));
        el?.setAttribute("y", String(-h / 2));
        el?.setAttribute("rx", String(ry));
      };

      updateEye(leftEyeRef.current, eyes[0]);
      updateEye(rightEyeRef.current, eyes[1]);
    };

    const loop = () => {
      applyEyes();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const avatarCx = rect.left + rect.width / 2;
      const avatarCy = rect.top + rect.height / 2;
      mxRef.current = clamp((e.clientX - avatarCx) / (window.innerWidth * 0.5), -1, 1);
      myRef.current = clamp((e.clientY - avatarCy) / (window.innerHeight * 0.5), -1, 1);
    };

    if (isInteractive) {
      window.addEventListener("mousemove", onMove);
    }

    const runBlink = () => {
      let frame = 1;
      const tick = () => {
        const t = frame;
        if (t <= 4) {
          blinkScaleRef.current = Math.max(0.04, 1 - t / 4);
        } else {
          blinkScaleRef.current = (t - 4) / 5;
        }
        frame += 1;
        if (frame <= 9) {
          blinkTimeoutRef.current = setTimeout(tick, 16);
        } else {
          blinkScaleRef.current = 1;
          scheduleNext();
        }
      };
      tick();
    };

    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 2000;
      blinkTimeoutRef.current = setTimeout(runBlink, delay);
    };
    scheduleNext();

    return () => {
      if (isInteractive) {
        window.removeEventListener("mousemove", onMove);
      }
      cancelAnimationFrame(rafRef.current);
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [eyes, isInteractive]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id={gradId} cx={grad.cx} cy={grad.cy} r="75%">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="45%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <clipPath id={clipId}>{shape.clip}</clipPath>
      </defs>
      <rect
        width="200"
        height="200"
        fill={`url(#${gradId})`}
        clipPath={`url(#${clipId})`}
      />
      <rect
        ref={leftEyeRef}
        x={-EYE_W / 2}
        y={-EYE_H / 2}
        width={EYE_W}
        height={EYE_H}
        rx={Math.min(EYE_W / 2, EYE_H / 2)}
        fill="rgba(0,0,0,0.80)"
        transform={`translate(${eyes[0].cx},${eyes[0].cy}) rotate(${eyes[0].rot})`}
      />
      <rect
        ref={rightEyeRef}
        x={-EYE_W / 2}
        y={-EYE_H / 2}
        width={EYE_W}
        height={EYE_H}
        rx={Math.min(EYE_W / 2, EYE_H / 2)}
        fill="rgba(0,0,0,0.80)"
        transform={`translate(${eyes[1].cx},${eyes[1].cy}) rotate(${eyes[1].rot})`}
      />
    </svg>
  );
}
