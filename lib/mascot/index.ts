/**
 * Dossier mascot kit — public API.
 *
 *   lib/mascot/          framework-free core (works in any canvas)
 *   components/mascot/   React wrappers (<Mascot>, <MascotStatic>, mascotBus)
 *
 * See docs/mascot/HANDOFF.md for integration steps.
 */
export * from "./avatar";
export * from "./catalog";
export { Ease, hashString, hexToRGB } from "./core";
export { MascotEngine, STATES, STATE_IDS, STATE_GLOW, EMOTE_IDS, ANGER_THRESHOLDS, ANNOYANCE_MODES } from "./engine";
export type { MascotState, Emote, SoundName, EngineOptions, AnnoyanceMode } from "./engine";
export { PERSONALITIES, PERSONALITY_IDS, IDLE_ACTION_IDS, IDLE_ACTION_GROUP, personalityFor } from "./idle";
export type { PersonalityId, Personality, IdleAction } from "./idle";
export { EYE_STYLES, EYE_STYLE_IDS, EXPRESSION_IDS } from "./eyes";
export type { EyeStyleId, Expression } from "./eyes";
export { MOMENTS, MOMENT_COOLDOWN_MS } from "./moments";
export type { MomentId, MomentDef, MomentTier, MomentStatus } from "./moments";
export { PALETTES, PALETTE_IDS } from "./palettes";
export type { PaletteId, Palette } from "./palettes";
export { SHAPES, SHAPE_IDS } from "./shapes";
export type { ShapeId, AccessorySlot } from "./shapes";
export { mount, renderStatic, prefersReducedMotion, SPILL_LIVE, SPILL_STATIC } from "./runtime";
export type { MascotController, MountOptions, FollowMode, Spill, StaticOptions } from "./runtime";
export { createSynth } from "./sound";
export { SET_ASIDE, LAUNCH, ACTIVE_EYE_STYLES, ACTIVE_CHEEKS, ACTIVE_SHAPES } from "./curation";
