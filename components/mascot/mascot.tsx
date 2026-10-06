"use client";

/**
 * <Mascot> — live, animated avatar (hero, user menu, focused places).
 * <MascotStatic> — one rendered frame as an <img> (lists, tables, comments).
 *
 * Both occupy exactly `size`×`size` in layout; hats, hands and confetti spill
 * outside the box without shifting anything (canvas is absolutely positioned,
 * pointer-events: none).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AvatarConfig, type FollowMode, type MascotController, type MascotState, type MomentId, type Spill,
  type Expression, MOMENTS, MOMENT_COOLDOWN_MS, PALETTES, SPILL_LIVE, SPILL_STATIC, createSynth, mount, renderStatic,
  type AnnoyanceMode, type PersonalityId,
} from "@/lib/mascot";
import { cn } from "@/lib/utils";
import { mascotBus } from "./mascot-bus";

const synth = createSynth(0.45);
/** Wire this to a user setting ("Mascot sounds"). Off by default. */
export function setMascotSound(on: boolean) { synth.enabled = on; }

export interface MascotProps {
  avatar: AvatarConfig;
  size: number;
  /** Persistent state (report due, writing, day off…). */
  state?: MascotState;
  /** Owner of this avatar — used to route bus events. Pass "me" for the signed-in user. */
  userId?: string;
  /** Listen to mascotBus moments for `userId`. */
  listen?: boolean;
  follow?: FollowMode;
  followRadius?: number;
  /** Click/tap pokes it (annoyance ladder). Use only on the user's own avatar. */
  interactive?: boolean;
  /** Doze after inactivity (ms). Hero only. */
  sleepAfterMs?: number;
  /** Stable person id (profile id) — picks their idle personality. Defaults to userId unless that is "me". */
  seed?: string;
  /** Override the derived idle personality. */
  personality?: PersonalityId;
  /** Which annoyance reaction taps trigger ("dizzy" original spin, or "burst"). Default "dizzy". */
  annoyance?: AnnoyanceMode;
  spill?: Spill;
  /** Fired once mounted — escape hatch for one-off choreography (e.g. lookAt the Submit button). */
  onReady?: (ctl: MascotController) => void;
  className?: string;
  "aria-label"?: string;
}

export function Mascot({
  avatar, size, state = "idle", userId = "me", listen = false, follow = "region", followRadius,
  interactive = false, sleepAfterMs = 0, spill = SPILL_LIVE, onReady, className, seed, personality, annoyance, ...rest
}: MascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctlRef = useRef<MascotController | null>(null);
  const lastPlayed = useRef(new Map<string, number>());
  const [ready, setReady] = useState(false);

  // mount once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctl = mount(canvas, {
      avatar, size, spill, follow, followRadius, interactive, sleepAfterMs,
      seed: seed ?? (userId !== "me" ? userId : undefined), personality, annoyance,
      onSound: (n) => synth.play(n),
    });
    ctl.engine.setState(state, true);
    ctlRef.current = ctl;
    onReady?.(ctl);
    setReady(true);
    return () => { ctl.destroy(); ctlRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctlRef.current?.engine.setAvatar(avatar); }, [avatar]);
  useEffect(() => { ctlRef.current?.engine.setState(state); }, [state]);
  useEffect(() => { ctlRef.current?.setSize(size); }, [size]);
  useEffect(() => { ctlRef.current?.setFollow(follow, followRadius); }, [follow, followRadius]);

  // moments from the bus
  useEffect(() => {
    if (!listen) return;
    return mascotBus.on(({ moment, userId: target }) => {
      const ctl = ctlRef.current;
      if (!ctl) return;
      if ((target ?? "me") !== userId) return;
      const def = MOMENTS[moment as MomentId];
      if (!def) return;
      const t = performance.now();
      if (def.tier === "moment" && t - (lastPlayed.current.get(moment) ?? -1e9) < MOMENT_COOLDOWN_MS) return;
      lastPlayed.current.set(moment, t);
      def.play(ctl.engine, (ms, fn) => setTimeout(fn, ms));
    });
  }, [listen, userId]);

  const pal = PALETTES[avatar.palette];
  return (
    <div
      role="img"
      aria-label={rest["aria-label"] ?? "Avatar"}
      className={cn("relative shrink-0 select-none", interactive && "cursor-pointer", className)}
      style={{ width: size, height: size }}
    >
      {/* SSR / pre-hydration placeholder in the avatar's colours (no layout shift) */}
      <span
        aria-hidden
        className={cn("absolute inset-[7%] rounded-full transition-opacity duration-300", ready ? "opacity-0" : "opacity-100")}
        style={{ background: pal.mid }}
      />
      <canvas ref={canvasRef} aria-hidden />
    </div>
  );
}

export interface MascotStaticProps {
  avatar: AvatarConfig;
  size: number;
  state?: MascotState;
  expression?: Expression;
  /** Team panels: flat colour body, bigger eyes. */
  mini?: boolean;
  bodyColor?: string;
  spill?: Spill;
  className?: string;
  alt?: string;
}

/** One frame, cached as an <img>. Renders a colour placeholder on the server. */
export function MascotStatic({ avatar, size, state, expression, mini, bodyColor, spill = SPILL_STATIC, className, alt = "" }: MascotStaticProps) {
  const [src, setSrc] = useState<string | null>(null);
  const key = useMemo(() => JSON.stringify([avatar, size, state, expression, mini, bodyColor, spill]), [avatar, size, state, expression, mini, bodyColor, spill]);
  useEffect(() => {
    // Client-only canvas draw. The colour disc below is the server placeholder.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(renderStatic(avatar, { size, state, expression, mini, bodyColor, spill }));
    // `key` already covers the draw inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const pal = PALETTES[avatar.palette];
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{
            left: -spill.x * size,
            top: -spill.top * size,
            width: size * (1 + 2 * spill.x),
            height: size * (1 + spill.top + spill.bottom),
          }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-[7%] rounded-full"
          style={{ background: pal.mid }}
        />
      )}
    </span>
  );
}

/** Convenience: fire a moment for your own avatar from any client component. */
export function useMascotMoment() {
  return (moment: MomentId, userId?: string) => mascotBus.emit(moment, { userId });
}
