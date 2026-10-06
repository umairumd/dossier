/**
 * Eyes have two independent layers:
 *
 *  1. IDENTITY STYLE (per person, chosen in the avatar builder): size, proportions,
 *     spacing, tilt, stagger and decoration (sparkle, lid). This is "their" face.
 *  2. EXPRESSION (shared by everyone, driven by states/emotes/moments): happy arcs,
 *     hearts, anger brows, spirals… Expressions are always drawn using the identity
 *     style's metrics (width, height, spacing, tilt), so an expression looks like
 *     *their* happy face, not a generic one. When the expression ends, the identity
 *     style comes back.
 *
 * So: styles are individual, expressions are universal — no expression is ever
 * locked to a particular eye style.
 */
import { heartPath, roundRectPath, starPath } from "./core";

export const EYE_STYLE_IDS = ["classic", "pill", "round", "tall", "oval", "sparkle", "sleepy", "dot"] as const;
export type EyeStyleId = (typeof EYE_STYLE_IDS)[number];

export interface EyeStyle {
  id: EyeStyleId;
  label: string;
  /** Eye width / height in units of R. */
  w: number;
  h: number;
  /** Half-spacing as a yaw angle on the face sphere (radians). */
  sp: number;
  /** Vertical placement as a pitch angle (positive = higher). */
  p: number;
  /** Rotation of each eye (radians). Classic = −12° like the legacy bot. */
  tilt: number;
  /** Right eye sits higher by this many R (legacy "head tilt" look). */
  stagger: number;
  decoration?: "sparkle" | "lid";
}

export const EYE_STYLES: Record<EyeStyleId, EyeStyle> = {
  classic: { id: "classic", label: "Classic", w: 0.216, h: 0.45, sp: 0.29, p: 0.1, tilt: -0.21, stagger: 0.11 },
  pill: { id: "pill", label: "Pill", w: 0.21, h: 0.32, sp: 0.33, p: 0.02, tilt: 0, stagger: 0 },
  round: { id: "round", label: "Round", w: 0.23, h: 0.23, sp: 0.34, p: 0.02, tilt: 0, stagger: 0 },
  tall: { id: "tall", label: "Tall", w: 0.17, h: 0.46, sp: 0.27, p: 0.04, tilt: 0, stagger: 0 },
  oval: { id: "oval", label: "Oval", w: 0.3, h: 0.2, sp: 0.37, p: 0.0, tilt: 0, stagger: 0 },
  sparkle: { id: "sparkle", label: "Sparkle", w: 0.25, h: 0.31, sp: 0.33, p: 0.02, tilt: 0, stagger: 0, decoration: "sparkle" },
  sleepy: { id: "sleepy", label: "Sleepy", w: 0.26, h: 0.24, sp: 0.34, p: 0.0, tilt: 0, stagger: 0, decoration: "lid" },
  dot: { id: "dot", label: "Minimal", w: 0.13, h: 0.13, sp: 0.3, p: 0.02, tilt: 0, stagger: 0 },
};

export const EXPRESSION_IDS = [
  "neutral", "wide", "happy", "closed", "line", "flat", "tired", "wink", "heart", "star",
  "spiral", "surprised", "cup", "angry", "furious", "sad",
] as const;
export type Expression = (typeof EXPRESSION_IDS)[number];

/** Identity-shaped eye (pill/round/oval…) at width w, height h, with blink `open`. */
function identityShape(x: CanvasRenderingContext2D, style: EyeStyle, w: number, h: number, open: number) {
  const hh = Math.max(h * open, Math.min(w, h) * 0.22);
  roundRectPath(x, -w / 2, -hh / 2, w, hh, Math.min(w / 2, hh / 2));
  x.fill();
  if (open < 0.5) return;
  if (style.decoration === "sparkle") {
    const keep = x.fillStyle;
    x.fillStyle = "rgba(255,255,255,0.92)";
    x.beginPath(); x.arc(w * 0.16, -hh * 0.2, w * 0.2, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(-w * 0.14, hh * 0.18, w * 0.08, 0, Math.PI * 2); x.fill();
    x.fillStyle = keep;
  }
}

/** Clip to the area below a slanted brow line (angry/sad). */
function browClip(x: CanvasRenderingContext2D, w: number, h: number, sd: number, inner: number, outer: number) {
  const innerX = -sd * w;
  const outerX = sd * w;
  x.beginPath();
  x.moveTo(outerX, -h * outer);
  x.lineTo(innerX, -h * inner);
  x.lineTo(innerX, h);
  x.lineTo(outerX, h);
  x.closePath();
  x.clip();
}

/**
 * Draws one eye centred at the current origin.
 * @param sd -1 = left eye, +1 = right eye
 */
export function drawEye(
  x: CanvasRenderingContext2D,
  expr: Expression,
  style: EyeStyle,
  w: number,
  h: number,
  sd: number,
  open: number,
  t: number,
  ink: string,
) {
  // sleepy identity draws a lid over neutral eyes
  const lid = style.decoration === "lid" && (expr === "neutral" || expr === "wide");
  switch (expr) {
    case "neutral":
    case "wide": {
      const k = expr === "wide" ? 1.18 : 1;
      if (lid) {
        x.save();
        x.beginPath(); x.rect(-w, -h * 0.12, w * 2, h * 2); x.clip();
        identityShape(x, style, w * k, h * k, open);
        x.restore();
        x.lineWidth = Math.max(1, w * 0.16); x.lineCap = "round"; x.strokeStyle = ink;
        x.beginPath(); x.moveTo(-w * 0.62, -h * 0.12); x.lineTo(w * 0.62, -h * 0.12); x.stroke();
      } else identityShape(x, style, w * k, h * k, open);
      break;
    }
    case "surprised": {
      const r = Math.min(w, h) * 0.42;
      x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
      break;
    }
    case "line": {
      const L = Math.max(w, h * 0.6) * 1.5;
      x.rotate(-sd * 0.2);
      roundRectPath(x, -L / 2, -L * 0.13, L, L * 0.26, L * 0.13); x.fill();
      break;
    }
    case "flat": {
      const L = Math.max(w, h * 0.6) * 1.4;
      roundRectPath(x, -L / 2, -L * 0.13, L, L * 0.26, L * 0.13); x.fill();
      break;
    }
    case "happy": {
      const r = Math.max(w, h * 0.55) * 0.82;
      x.lineWidth = Math.max(1.2, r * 0.6); x.lineCap = "round";
      x.beginPath(); x.arc(0, r * 0.45, r, Math.PI * 1.12, Math.PI * 1.88); x.stroke();
      break;
    }
    case "closed": {
      const r = Math.max(w, h * 0.55) * 0.78;
      x.lineWidth = Math.max(1, r * 0.44); x.lineCap = "round";
      x.beginPath(); x.arc(0, -r * 0.2, r, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
      break;
    }
    case "tired": {
      const W = Math.max(w, h * 0.55);
      roundRectPath(x, -W / 2, -W * 0.05, W, W * 0.48, W / 2); x.fill();
      roundRectPath(x, -W * 0.62, -W * 0.16, W * 1.24, W * 0.22, W * 0.11); x.fill();
      break;
    }
    case "wink":
      if (sd < 0) identityShape(x, style, w, h, open);
      else drawEye(x, "happy", style, w, h, sd, open, t, ink);
      break;
    case "heart": {
      const keep = x.fillStyle;
      x.fillStyle = "#FF4D6D"; heartPath(x, Math.max(w, h * 0.6) * 1.2); x.fill();
      x.fillStyle = keep;
      break;
    }
    case "star": {
      const keep = x.fillStyle;
      x.fillStyle = "#F7B32B"; x.rotate(t * 1.5 * sd);
      const S = Math.max(w, h * 0.6);
      starPath(x, S * 1.05, S * 0.46); x.fill();
      x.fillStyle = keep;
      break;
    }
    case "spiral": {
      const S = Math.max(w, h * 0.6);
      x.lineWidth = Math.max(1, S * 0.22); x.lineCap = "round"; x.beginPath();
      for (let a = 0; a < 4.4 * Math.PI; a += 0.2) {
        const r = S * 0.06 + a * S * 0.058;
        const aa = a + t * 9 * sd;
        if (a === 0) x.moveTo(Math.cos(aa) * r, Math.sin(aa) * r);
        else x.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
      }
      x.stroke();
      break;
    }
    case "cup": {
      const W = Math.max(w, h * 0.55);
      const hh = Math.max(h * open, W * 0.3);
      const cr = Math.min(W / 2, hh / 2);
      x.beginPath(); x.moveTo(-W / 2, -hh / 2); x.lineTo(W / 2, -hh / 2); x.lineTo(W / 2, hh / 2 - cr);
      x.quadraticCurveTo(W / 2, hh / 2, W / 2 - cr, hh / 2); x.lineTo(-W / 2 + cr, hh / 2);
      x.quadraticCurveTo(-W / 2, hh / 2, -W / 2, hh / 2 - cr); x.closePath(); x.fill();
      break;
    }
    case "angry":
    case "furious": {
      const k = expr === "furious" ? 0.9 : 1;
      const hh = Math.max(h, w * 0.9) * k;
      x.save();
      browClip(x, w, hh, sd, expr === "furious" ? 0.02 : 0.12, 0.62);
      identityShape(x, style, w * k, hh, 1);
      x.restore();
      // brow stroke for extra read at small sizes
      x.lineWidth = Math.max(1.2, w * 0.24); x.lineCap = "round"; x.strokeStyle = ink;
      x.beginPath(); x.moveTo(sd * w * 0.75, -hh * 0.78); x.lineTo(-sd * w * 0.7, -hh * (expr === "furious" ? 0.3 : 0.42)); x.stroke();
      break;
    }
    case "sad": {
      const hh = Math.max(h, w * 0.9);
      x.save();
      browClip(x, w, hh, sd, 0.62, 0.15);
      identityShape(x, style, w, hh, open);
      x.restore();
      break;
    }
  }
}
