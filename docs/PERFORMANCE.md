# Dossier — Loading Data Fast

How pages and components load data. Every new page, card and query follows
these rules; review against them before merging. The home page
(`components/dashboard/*-dashboard.tsx`) is the reference implementation.

Why it matters: each Supabase call is a network round trip (tens of ms from
Vercel, hundreds from a laptop in Pakistan). A page's wait is roughly the
number of round trips made *one after another*, not the total number.

## 1. Checking who is signed in

- Use `getAuthUser()` from `lib/supabase/server.ts`. It is `cache()`-wrapped,
  so one render verifies the session once, and it uses `getClaims()`, which
  checks the token locally when the project signs tokens with asymmetric keys.
- Never call `supabase.auth.getUser()` inside a query. (Server actions that
  already do so are fine to leave; they run once per action.)
- For role checks in queries use `requireAdminUser()` / `requireOwnerUser()`;
  they reuse the cached `getCurrentProfile()`, so they cost nothing extra in a
  render.
- The proxy (`proxy.ts` → `lib/supabase/proxy.ts`) refreshes the session with
  `getClaims()` on every request. The app layout loads the profile and starts
  the shell's reads (organization name, notifications) at the same time.

## 2. Queries

- Wrap every read in `cache()` (React) so several components can ask for the
  same data and the database is hit once per request. Pass plain arguments
  (strings, numbers), not objects, so the cache key matches.
- Shared day context: `getHomeDay()` (settings, org-local today, off day,
  leave, deadline passed) and `getMyAttendanceHistory()` in
  `lib/supabase/queries/home.ts`. Use them instead of re-deriving.
- Select only the columns you use. Stats need `report_date, submitted_at`,
  not the report text. Lists that show text page through it.
- Run independent reads together with `Promise.all`. When one read needs
  another's result, chain it *inside* the same `Promise.all` so it starts as
  soon as its input is ready:

  ```ts
  const profileP = getCurrentProfile();
  const [profile, settings, template] = await Promise.all([
    profileP,
    getOrganizationSettings(),
    profileP.then((p) => (p ? resolveTemplate(p.id, p.department_ids) : null)),
  ]);
  ```

- Keep role checks first when the next reads are admin-only (they throw for
  other roles). They are free: the layout already loaded the profile.
- Never fetch "everything" for a list. Page it with `.range()` and
  `{ count: "exact" }` (see `getReportsForAuthor`, 10 per page).
- Fetch a related row in the same round when possible (for example all
  `profile_departments` rows, filtered in code) instead of a second query that
  waits for the first.
- Data a click will need belongs with the list that shows it: a report list
  loads its reports' comments in the same round (`getCommentsForReports`),
  so opening a report needs no request.
- Writes and side effects (unlock checks, last seen) never block a render:
  run them from the browser after the page shows, or fire-and-forget.

## 3. Pages stream in sections

- Every route has a `loading.tsx` built from `components/shared/skeletons.tsx`
  for the moment before the page starts rendering.
- A page with several independent cards renders each card as its own async
  component inside `<Suspense fallback={<CardSkeleton …/>}>`, so the page
  fills in card by card instead of waiting for the slowest query.
- Put the most important card first and nest the rest inside its boundary
  when it must appear first (the home hero does this). Siblings still start
  fetching at the same time.
- Content enters with the `rise-in` utility.
- Skeletons mirror the real container (same card, padding, heights) so
  nothing jumps; titles, notes and footer links are bars (`TextSkeleton`),
  page titles and column headers stay as text.

## 4. Client components

- Pass data down from server components; don't fetch on mount when the server
  can send it.
- Anything drawn only in the browser (buddies, charts) should not flash a
  placeholder: draw in `useLayoutEffect`, or keep the section behind its
  skeleton until hydrated (see `DashboardHero`).

## 5. Checking a page

- Typecheck and lint: `npx tsc --noEmit`, `npx eslint <files>`.
- Stream timing in the browser console on the signed-in page:

  ```js
  const t0 = performance.now();
  const r = await fetch(location.pathname, { cache: "no-store" });
  const reader = r.body.getReader();
  let first;
  for (;;) { const { done } = await reader.read(); if (done) break; first ??= Math.round(performance.now() - t0); }
  ({ first, end: Math.round(performance.now() - t0) });
  ```

  `first` is when the shell arrives, `end` when the last section streams.
  Run it a few times: local numbers swing with the connection to Supabase.
