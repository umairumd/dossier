# Dossier Buddy — handoff package (for Cursor)

`docs/mascot/DESIGN.md` is the source of truth for **what** ships. This file explains
**what's in the package and how it plugs into Dossier**. Everything typechecks in strict
mode against React 19 / Next 16 types.

## Package contents

```
lib/mascot/                     framework-free engine — copy as-is
  index.ts                      public API (import everything from "@/lib/mascot")
  engine.ts                     MascotEngine: states, emotes, idle life, poke reactions, drop box, accessories
  avatar.ts avatar-types.ts     AvatarConfig, defaultAvatar(id), randomAvatar(), sanitizeAvatar(), avatarKey()
  curation.ts                   SET_ASIDE (not offered at launch) + LAUNCH (what's on, tiers, caps)
  catalog.ts                    accessories, rarity, unlock rules: evaluateUnlocks / isWearable / unlockProgress
  moments.ts                    every moment: id, tier, status (live | reserved), where, trigger, choreography
  idle.ts                       idle personalities + actions
  shapes.ts palettes.ts eyes.ts effects.ts runtime.ts sound.ts core.ts
  outfits/renderers.ts          16 accessories (3D-projected, per-shape fit, hat brim clearance)
  THIRD_PARTY_NOTICES.md        MIT notice for adapted Coucou code — KEEP IT (repo is mirrored publicly)
components/mascot/
  mascot.tsx                    <Mascot> (live canvas) + <MascotStatic> (cached image) + setMascotSound
  mascot-bus.ts                 mascotBus.emit("report.submitted", userId?)
  member-avatar.tsx             drop-in replacement for components/shared/member-avatar.tsx (same props + avatar/state/live)
  avatar-builder.tsx            builder + wardrobe (functional reference UI — restyle freely)
lib/actions/avatar.ts           saveMyAvatar, syncMyUnlocks (getRewardStats is a TODO)
supabase/migrations/20261006000001_mascot_avatars.sql
                                profiles.avatar + avatar_unlocks + RLS + random backfill for existing members
docs/mascot/DESIGN.md           design & launch spec
docs/mascot/HANDOFF.md          this file
docs/mascot/CURSOR_PLAN_PROMPT.md  the planning prompt
reference/buddy-lab.html        the Buddy Lab — open in a browser to see/try everything (do not ship it)
```

## How it plugs in

| Dossier piece | What changes |
|---|---|
| `components/shared/member-avatar.tsx` (13 files use it) | body becomes a re-export of `components/mascot/member-avatar.tsx`; call sites keep working; they gain `avatar` from `profiles.avatar` |
| `avatarUrl` / `avatar_url` props on call sites | ignored by the new MemberAvatar (no photos in Dossier); remove them from callers and stop passing `avatar_url` to it. Leave the DB column alone. |
| `components/shared/bot-avatar.tsx`, `expression-pills.tsx` | removed once everything renders through the new MemberAvatar |
| Profile queries + `types/profile.ts` / `types/employee.ts` | select and type `avatar` wherever MemberAvatar is fed |
| Settings → Profile (`app/(app)/settings/profile`) | a "Your buddy" section: builder, wardrobe, save |
| Dashboard hero (`app/(app)/(home)`) | your own live buddy + moments |
| Submit report sheet | drop box moments on the Submit button |
| Notification realtime | ping / comment / leave moments |
| `components/dashboard/team-today-panel.tsx`, birthdays | ambient buddies (cap 12 live), party hat |
| Report submit server action | call `syncMyUnlocks()` after success |
| `lib/helpers/report-stats.ts` | feeds `getRewardStats()` (working-day streaks) |

## Data

- `profiles.avatar jsonb` — `{v, shape, palette, eyes{style,size,spacing}, cheeks, reaction, accessories}`.
  Always read through `sanitizeAvatar(raw, profileId)`; never trust raw JSON.
- `avatar_unlocks (profile_id, item_id, source, unlocked_at)` — written only by the service role.
- No profile photos: every person renders as their buddy everywhere.
- Migration backfills every existing member (`avatar is null`) with a **random shape + colour**,
  Tall eyes, no cheeks, Dizzy, no accessories. New people get `defaultAvatar(id)` (stable,
  picked from their id) until they save.

## Hard rules

1. Work on the feature branch; never commit to `main` directly.
2. Never commit `reference/` or anything from an `_internal-reference/` folder. Keep
   `lib/mascot/THIRD_PARTY_NOTICES.md`.
3. App code fires **moments** (`mascotBus.emit`), never engine methods (except `lookAt` on the Submit button).
4. Lists use `MascotStatic` (cached image). Live engine only where `LAUNCH.tiers` says, max `LAUNCH.maxLiveAvatars` per screen.
5. Respect `SET_ASIDE`: nothing set aside appears in the UI.
6. Anger/reactions only come from poking your own buddy — never from app events.
7. No new dependencies are needed (no zod). Use the existing shadcn components, tokens and Tailwind v4.
8. Run `npx tsc --noEmit` and `npm run lint` after every phase; verify in light and dark mode and on mobile width.
