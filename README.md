# Dossier

Dossier is a daily progress tracking system for teams. Employees submit an immutable end-of-day report. Managers review department completion, missing work, and trends. Admins run the organization: people, departments, invitations, and settings.

## Features

### Employee

- Submit one daily report (accomplishments, blockers, tomorrow's plan)
- View personal report history, streak, and completion
- Update profile name and password

### Manager

- Department dashboard: completion today, missing/late reports, streaks, activity
- Date-filtered team reports with On Time / Late / Missed status
- Missing-reports view and a read-only team roster

### Admin

- Organization overview and analytics
- Invite, edit, deactivate, archive, restore, or permanently delete people
- Create and archive departments; assign managers
- Invitation tracking, activity feed, report deadline setting

## Tech Stack

- Next.js 16 (App Router, React Server Components, Server Actions)
- React 19 with React Compiler
- TypeScript (strict)
- Supabase (PostgreSQL, Auth, RLS, Admin API)
- Tailwind CSS v4
- shadcn/ui
- Vercel (deployment)

## Architecture

Accounts are invitation-only; there is no public sign-up. Authorization is enforced in Postgres with role-scoped Row Level Security. The app has no REST API: mutations go through Server Actions. Sessions are cookie-based via `@supabase/ssr`.

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- (Optional) Vercel account for deployment

### Setup

1. Clone the repo.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in the values below.
4. Apply every file in `supabase/migrations/` to your Supabase project (CLI `supabase db push` or SQL Editor, in filename order).
5. Bootstrap the first admin: see [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) (section **Bootstrap First Admin**).
6. `npm run dev`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `NEXT_PUBLIC_SITE_URL` | No | Optional origin override for password-reset redirects (custom domain) |
| `NEXT_PUBLIC_VERCEL_URL` | No | Auto-set by Vercel on every deploy; no action needed |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Admin API (invite/ban/delete). Never expose to the client. |

Add your app's `/reset-password` URL (`http://localhost:3000/reset-password` and production) under **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard.

## Scripts

- `npm run seed-demo` / `npm run seed-demo:reset` — seed (or wipe and reseed) a demo org via `scripts/seed-demo.ts`
- `npm run recovery` — emergency admin CLI (`scripts/recovery-cli.ts`): list/promote/reactivate/restore/unban/create-admin

## Documentation

- [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) — setup, conventions, first admin
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — App Router, RLS, Server Actions
- [docs/DATABASE.md](docs/DATABASE.md) — schema and migrations
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — roles and RLS
- [docs/REPORT_SYSTEM.md](docs/REPORT_SYSTEM.md) — daily reports
- [docs/PRODUCT.md](docs/PRODUCT.md) — product spec
- [docs/UI_GUIDELINES.md](docs/UI_GUIDELINES.md) — UI and nav
- [docs/DEMO_SETUP.md](docs/DEMO_SETUP.md) — demo seeder
- [docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md) — QA scenarios
- [docs/EMERGENCY_RECOVERY.md](docs/EMERGENCY_RECOVERY.md) — locked-out admin recovery
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md) — proposed test strategy
- [docs/TECH_DEBT.md](docs/TECH_DEBT.md) — known debt
- [docs/ROADMAP.md](docs/ROADMAP.md) — product roadmap
- [PROJECT.md](PROJECT.md) — short project brief

## License

MIT
