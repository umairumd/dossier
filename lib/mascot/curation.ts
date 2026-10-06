/**
 * Curation shelf. Items listed here still work everywhere (old saved avatars keep
 * rendering, the Buddy Lab can play them) but are SET ASIDE: the avatar builder,
 * shuffle and defaults never offer them. Move an id out of a list to bring it back.
 */
import { CHEEK_STYLES, type CheekStyle } from "./avatar-types";
import { EYE_STYLE_IDS, type EyeStyleId } from "./eyes";
import { SHAPE_IDS, type ShapeId } from "./shapes";

export const SET_ASIDE = {
  eyeStyles: ["classic", "sparkle", "dot"] as EyeStyleId[],
  cheeks: ["soft"] as CheekStyle[],
  shapes: [] as ShapeId[],
  accessories: [] as string[],
  /** Moments designed and playable in the Lab but not wired at launch (status "reserved"). */
  moments: ["island.expand", "mood.week", "music.dance", "team.wave", "explode.manual", "roll.flip"],
  /** Engine features kept for later; nothing at launch calls them. */
  features: ["sound", "dance", "smoke", "personalityPicker", "dropBoxOutsideHero"],
};

/**
 * Launch configuration — the single place the app reads "what's on" from.
 * Everything not listed here (or listed in SET_ASIDE) stays in the kit for later.
 */
export const LAUNCH = {
  /** Synth sounds ship off (no setting UI yet). */
  sound: false,
  /** Default tap reaction for new avatars; people can switch in the builder. */
  defaultReaction: "dizzy" as const,
  /** Idle personality comes from the person's id; no picker at launch. */
  personalityPicker: false,
  /** Most live (animated) avatars on one screen; the rest render as cached images. */
  maxLiveAvatars: 12,
  /** Hero dozes after this long without input. */
  sleepAfterMs: 8 * 60 * 1000,
  /** Where each motion tier is used. */
  tiers: {
    live: ["Dashboard hero (your own buddy)", "Avatar builder preview"],
    ambient: ["Team Today panel (manager/admin)", "Birthdays page"],
    static: ["Every other MemberAvatar: tables, lists, comments, menus, notifications"],
  },
} as const;

export const ACTIVE_EYE_STYLES = EYE_STYLE_IDS.filter((id) => !SET_ASIDE.eyeStyles.includes(id));
export const ACTIVE_CHEEKS = CHEEK_STYLES.filter((id) => !SET_ASIDE.cheeks.includes(id));
export const ACTIVE_SHAPES = SHAPE_IDS.filter((id) => !SET_ASIDE.shapes.includes(id));
