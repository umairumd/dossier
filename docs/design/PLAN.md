# Design language: plan

Branch `refactor/design-system`. Mockups: Claude Design canvas "Dossier Design", page "Design language · round 1".

## Decisions (Oct 9)

1. **Cards: Lifted.** One surface for every card: `surface-card` (soft top highlight, hairline border, shadow). No tinted gradients, no `ring-1` + `bg-card` cards, no `bg-muted` fills inside cards (it matches the card colour in dark mode).
2. **Loading: Sweep.** `Skeleton` uses one band of light that sweeps across every block at once. Skeleton shapes mirror the real content. Content enters with `rise-in` (staggered with `--rise-delay`). Pages stream: each card loads in its own boundary.
3. **Sidebar: Inset.** Sidebar blends into the background; the page sits on a raised, rounded panel. The collapse button stays in the top bar next to the breadcrumbs.
4. **Report reader: proposed direction.** Header with who/when, previous/next and close together (arrow keys). Fields adapt to the template: text fields read as paragraphs; number fields group into a figure strip only when there are two or more, in template order; links, toggles and lists get their own compact rendering. Comments always visible, comment box pinned at the bottom.

## Scale

- Type: page title 24/600; big figure 28/600 tabular; card title 15/600; body 14; meta 12 muted; eyebrow 11/500 caps (`label-eyebrow`). No 10px text.
- Radius: card 14 (`rounded-xl`), inset 12, control 9, pill full. Dialogs 18 (`rounded-2xl`).
- Spacing: 24 between page sections, 16 between cards, 20 card padding, 14 inset padding.
- Dialog backdrop: black 40% (light) / 60% (dark) with a light blur. Dialog surface: `surface-overlay`.

## Steps

1. Foundations: tokens and utilities in `globals.css`, `Card`, `Skeleton`, dialog/alert/sheet backdrop and surface, button transitions, bespoke cards moved to `surface-card`. **Done, awaiting review.**
2. Home page: streaming sections, skeletons that mirror the hero and cards, `rise-in`, parallel follow-up queries.
3. Sidebar and top bar (Inset).
4. Report reader (adaptive fields, comments).
5. Remaining pages, one area at a time; then the default button height (36px) and removal of 10px text.
