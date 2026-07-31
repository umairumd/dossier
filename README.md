# Inoma Hub

Internal operations platform for Inoma Digital. Employees submit daily
reports; managers track team completion; admins manage people,
departments, and organization-wide settings.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) (Postgres, Auth, Row Level Security)
- Tailwind v4 + [shadcn/ui](https://ui.shadcn.com)
- Deployed on [Vercel](https://vercel.com)

## Getting started

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings | **Server-only, never expose to the client.** Used for inviting/banning/deleting users via the Admin API. |
| `NEXT_PUBLIC_SITE_URL` | — | Optional. Overrides the origin used for invite-link redirects. Only needed for a custom production domain — local dev and Vercel deploys resolve this automatically. |

### 2. Database

Apply every migration in `supabase/migrations/` to your Supabase project,
in order — either via the Supabase CLI (`supabase db push`, if you've
linked the project) or by pasting each file into the SQL Editor in
filename order. Migrations are the source of truth for the schema; there
is no separate schema dump to keep in sync.

In the Supabase dashboard, add your app's `/invite` URL (both
`http://localhost:3000/invite` and your production domain's) to
**Authentication → URL Configuration → Redirect URLs** — without this,
invitation links won't work.

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Your first admin account

There's no public sign-up — every account starts as an invitation. To
bootstrap the very first admin (before any admin exists to invite one),
create a user directly in the Supabase dashboard under
**Authentication → Users → Add user**, then in the SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<the new user''s id>';
```

Every subsequent account should be created through the app itself
(**People → Employees → Invite Employee**), not this manual path.

### 5. Demo data (optional)

`supabase/seed.sql` seeds a handful of departments (safe to run via
`supabase db reset` locally, or paste into the SQL Editor). It
deliberately doesn't create people — Supabase Auth users need to go
through the Auth API to get correctly hashed passwords, not raw SQL.
Instead:

1. Sign in as an admin and invite a few manager/employee demo accounts.
2. Once an account exists, use `docs/demo-reports.sql` as a template to
   backfill two weeks of realistic-looking daily reports for it, so
   dashboards, streaks, and completion trends aren't empty.

## Roles

- **Employee** — submits daily reports, views their own history and profile.
- **Manager** — reviews their department's reports, sees missing/late
  submissions and team trends; cannot manage identity/access (invite,
  archive, change roles).
- **Admin** — full organization management: people, departments,
  invitations, and organization-wide settings.

## Deployment

Deployed on Vercel. Set the same environment variables there as in
`.env.local`. Vercel's `VERCEL_URL` is picked up automatically for
invite-link redirects — only set `NEXT_PUBLIC_SITE_URL` if you're using a
custom domain.

## Quality checks

```bash
npx tsc --noEmit   # TypeScript
npx eslint .       # Lint
npm run build      # Production build
```

These catch compile-time and type errors, not runtime/UX issues — always
verify a change by actually using the affected flow, not just a green
build.
