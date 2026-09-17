"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type BotExpression = "neutral" | "wink" | "wide" | "notification";

interface BotAvatarProps {
  userId: string;
  size?: number;
  className?: string;
  interactive?: boolean;
  expression?: BotExpression;
}

interface EyeState {
  w: number;
  h: number;
  rx: number;
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

const EYE_EXPRESSIONS = {
  neutral: { w: 19, h: 40 },
  wide: { w: 32, h: 64 },
  wink_normal: { w: 19, h: 40 },
  wink_shut: { w: 26, h: 7 },
  notification: { w: 44, h: 44 },
} as const;

const NEUTRAL_EYE: EyeState = { w: 19, h: 40, rx: 9.5 };
const LERP = 0.14;

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

function lerpEye(cur: EyeState, tgt: EyeState) {
  cur.w += (tgt.w - cur.w) * LERP;
  cur.h += (tgt.h - cur.h) * LERP;
  cur.rx = Math.min(cur.w / 2, cur.h / 2);
}

export function BotAvatar({
  userId,
  size = 32,
  className,
  interactive,
  expression = "neutral",
}: BotAvatarProps) {
  const isInteractive = interactive ?? false;
  const uid = useId().replace(/:/g, "");
  const gradId = `bot-grad-${uid}`;
  const clipId = `bot-clip-${uid}`;

  const hash = hashString(userId);
  const shapeKey = ACTIVE_SHAPES[hash % ACTIVE_SHAPES.length];
  const PALETTE_OVERRIDES: Record<string, number> = {
    // Add UUID → palette index overrides here
  };
  const paletteIndex =
    PALETTE_OVERRIDES[userId] !== undefined
      ? PALETTE_OVERRIDES[userId]
      : (hash >> 4) % PALETTES.length;
  const palette = PALETTES[paletteIndex];
  const shape = SHAPES[shapeKey];
  const { eyes, grad } = shape;

  const svgRef = useRef<SVGSVGElement>(null);
  const leftEyeRef = useRef<SVGRectElement>(null);
  const rightEyeRef = useRef<SVGRectElement>(null);
  const badgeRef = useRef<SVGCircleElement>(null);
  const mxRef = useRef(0);
  const myRef = useRef(0);
  const blinkScaleRef = useRef(1);
  const rafRef = useRef<number>(0);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleDriftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTargetMxRef = useRef(0);
  const idleTargetMyRef = useRef(0);
  const expressionRef = useRef<BotExpression>("neutral");
  const leftEyeCurRef = useRef<EyeState>({ ...NEUTRAL_EYE });
  const rightEyeCurRef = useRef<EyeState>({ ...NEUTRAL_EYE });
  const leftEyeTgtRef = useRef<EyeState>({ ...NEUTRAL_EYE });
  const rightEyeTgtRef = useRef<EyeState>({ ...NEUTRAL_EYE });

  const setExpression = (expr: BotExpression) => {
    expressionRef.current = expr;
    if (expr !== "neutral") {
      blinkScaleRef.current = 1;
    }
    switch (expr) {
      case "neutral":
        leftEyeTgtRef.current = { ...EYE_EXPRESSIONS.neutral, rx: 0 };
        rightEyeTgtRef.current = { ...EYE_EXPRESSIONS.neutral, rx: 0 };
        break;
      case "wide":
        leftEyeTgtRef.current = { ...EYE_EXPRESSIONS.wide, rx: 0 };
        rightEyeTgtRef.current = { ...EYE_EXPRESSIONS.wide, rx: 0 };
        break;
      case "wink":
        leftEyeTgtRef.current = { ...EYE_EXPRESSIONS.wink_normal, rx: 0 };
        rightEyeTgtRef.current = { ...EYE_EXPRESSIONS.wink_shut, rx: 0 };
        break;
      case "notification":
        leftEyeTgtRef.current = { ...EYE_EXPRESSIONS.notification, rx: 0 };
        rightEyeTgtRef.current = { ...EYE_EXPRESSIONS.notification, rx: 0 };
        break;
    }
  };

  useEffect(() => {
    setExpression(expression ?? "neutral");
  }, [expression]);

  useEffect(() => {
    let dx = 0;
    let dy = 0;

    const applyBlink = (cur: EyeState, applyBlinkToThis: boolean) => {
      const expr = expressionRef.current;
      const blinkAllowed = expr === "neutral" || expr === "wink";
      const h =
        applyBlinkToThis && blinkAllowed
          ? Math.max(1.5, cur.h * blinkScaleRef.current)
          : cur.h;
      return { h, rx: Math.min(cur.w / 2, h / 2) };
    };

    const updateEl = (
      el: SVGRectElement | null,
      eye: { cx: number; cy: number; rot: number },
      cur: EyeState,
      applyBlinkToThis: boolean,
    ) => {
      const { h, rx } = applyBlink(cur, applyBlinkToThis);
      el?.setAttribute(
        "transform",
        `translate(${eye.cx + dx},${eye.cy + dy}) rotate(${eye.rot})`,
      );
      el?.setAttribute("width", String(cur.w));
      el?.setAttribute("x", String(-cur.w / 2));
      el?.setAttribute("height", String(h));
      el?.setAttribute("y", String(-h / 2));
      el?.setAttribute("rx", String(rx));
      el?.setAttribute("ry", String(rx));
    };

    const applyEyes = () => {
      lerpEye(leftEyeCurRef.current, leftEyeTgtRef.current);
      lerpEye(rightEyeCurRef.current, rightEyeTgtRef.current);

      dx = mxRef.current * 18;
      dy = myRef.current * 22;

      const isWinking = expressionRef.current === "wink";
      updateEl(leftEyeRef.current, eyes[0], leftEyeCurRef.current, !isWinking);
      updateEl(rightEyeRef.current, eyes[1], rightEyeCurRef.current, !isWinking);

      const isNotification = expressionRef.current === "notification";
      badgeRef.current?.setAttribute("opacity", isNotification ? "1" : "0");
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
      mxRef.current = clamp(
        (e.clientX - avatarCx) / (window.innerWidth * 0.7),
        -1,
        1,
      );
      myRef.current = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
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

    // Idle drift — only when not in interactive (mouse tracking) mode
    // Each avatar gets a deterministic starting direction from userId hash,
    // then drifts to new random positions every 1.5–3 seconds
    if (!isInteractive) {
      // Seed initial position from hash so avatars face different directions
      const hashVal = hashString(userId);
      const seedAngle = (hashVal % 360) * (Math.PI / 180);
      mxRef.current = Math.cos(seedAngle) * 0.5;
      myRef.current = Math.sin(seedAngle) * 0.4;

      const driftToNext = () => {
        // Pick a new random target within ±0.6 range
        idleTargetMxRef.current = (Math.random() - 0.5) * 1.8;
        idleTargetMyRef.current = (Math.random() - 0.5) * 1.4;

        // Smoothly lerp toward target over ~800ms using small steps
        let steps = 0;
        const totalSteps = 50; // ~800ms at 16ms intervals
        const startMx = mxRef.current;
        const startMy = myRef.current;
        const targetMx = idleTargetMxRef.current;
        const targetMy = idleTargetMyRef.current;

        const driftStep = () => {
          steps++;
          const progress = steps / totalSteps;
          // Ease in-out
          const eased =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          mxRef.current = startMx + (targetMx - startMx) * eased;
          myRef.current = startMy + (targetMy - startMy) * eased;

          if (steps < totalSteps) {
            idleDriftRef.current = setTimeout(driftStep, 16);
          } else {
            // Hold at target for 1.5–3 seconds then drift again
            idleDriftRef.current = setTimeout(
              driftToNext,
              1500 + Math.random() * 1500,
            );
          }
        };

        idleDriftRef.current = setTimeout(driftStep, 16);
      };

      // Start first drift after a random delay (so avatars don't all move together)
      idleDriftRef.current = setTimeout(driftToNext, Math.random() * 2000);
    }

    const sidebar = isInteractive
      ? document.querySelector("aside, nav, [data-sidebar]")
      : null;
    const onSidebarEnter = () => {
      if (expressionRef.current === "neutral") setExpression("wide");
    };
    const onSidebarLeave = () => {
      if (expressionRef.current === "wide") setExpression("neutral");
    };
    if (sidebar) {
      sidebar.addEventListener("mouseenter", onSidebarEnter);
      sidebar.addEventListener("mouseleave", onSidebarLeave);
    }

    return () => {
      if (isInteractive) {
        window.removeEventListener("mousemove", onMove);
      }
      if (sidebar) {
        sidebar.removeEventListener("mouseenter", onSidebarEnter);
        sidebar.removeEventListener("mouseleave", onSidebarLeave);
      }
      cancelAnimationFrame(rafRef.current);
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      if (idleDriftRef.current) {
        clearTimeout(idleDriftRef.current);
      }
    };
  }, [eyes, isInteractive, userId]);

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
        x={-NEUTRAL_EYE.w / 2}
        y={-NEUTRAL_EYE.h / 2}
        width={NEUTRAL_EYE.w}
        height={NEUTRAL_EYE.h}
        rx={NEUTRAL_EYE.rx}
        fill="rgba(0,0,0,0.80)"
        transform={`translate(${eyes[0].cx},${eyes[0].cy}) rotate(${eyes[0].rot})`}
      />
      <rect
        ref={rightEyeRef}
        x={-NEUTRAL_EYE.w / 2}
        y={-NEUTRAL_EYE.h / 2}
        width={NEUTRAL_EYE.w}
        height={NEUTRAL_EYE.h}
        rx={NEUTRAL_EYE.rx}
        fill="rgba(0,0,0,0.80)"
        transform={`translate(${eyes[1].cx},${eyes[1].cy}) rotate(${eyes[1].rot})`}
      />
      <circle
        ref={badgeRef}
        cx="38"
        cy="38"
        r="20"
        fill={palette.mid}
        stroke="#010102"
        strokeWidth="3"
        opacity="0"
      />
    </svg>
  );
}
