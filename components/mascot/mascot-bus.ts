"use client";

/**
 * App-wide mascot event bus. Anything can fire a moment; every live <Mascot listen>
 * whose `userId` matches (or that listens to "me") plays it.
 *
 *   import { mascotBus } from "@/components/mascot/mascot-bus";
 *   mascotBus.emit("report.submitted");                 // your own avatar
 *   mascotBus.emit("birthday.teammate", { userId });    // someone else's avatar
 */
import type { MomentId } from "@/lib/mascot";

export interface MascotEvent {
  moment: MomentId;
  /** Target avatar; omit for the signed-in user's own avatar ("me"). */
  userId?: string;
}

type Listener = (e: MascotEvent) => void;
const listeners = new Set<Listener>();

export const mascotBus = {
  emit(moment: MomentId, opts: { userId?: string } = {}) {
    const ev: MascotEvent = { moment, userId: opts.userId };
    for (const l of listeners) l(ev);
  },
  on(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};
