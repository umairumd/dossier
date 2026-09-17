# Dossier — Demo Environment Setup

This guide explains how to set up a complete demo environment for testing Dossier.

---

## Quick Start

```bash
# Run the demo seeder (automatically loads .env.local)
npm run seed-demo
```

The script automatically loads environment variables from `.env.local` — no manual exports needed.

By default the seeder targets the org slug `acme`. Override with:

```bash
SEED_ORG_SLUG=your-org-slug npm run seed-demo
```

---

## What Gets Created

### Departments

| Department | Manager |
|------------|---------|
| Engineering | Sarah Chen |
| Design | Marcus Johnson |
| Sales | David Park |
| Customer Support | (unassigned) |

### Users

All confirmed demo users use the password: **`demo123!`**

| Email | Name | Role | Department |
|-------|------|------|------------|
| owner@dossier-demo.com | Alex Morgan | Owner | - |
| hr@dossier-demo.com | Jordan Smith | Admin | - |
| eng.lead@dossier-demo.com | Sarah Chen | Manager | Engineering |
| design.lead@dossier-demo.com | Marcus Johnson | Manager | Design |
| sales.lead@dossier-demo.com | David Park | Manager | Sales |
| alice@dossier-demo.com | Alice Rivera | Member | Engineering |
| bob@dossier-demo.com | Bob Patel | Member | Engineering |
| carol@dossier-demo.com | Carol Williams | Member | Design |
| dave@dossier-demo.com | Dave Kim | Member | Sales |
| eva@dossier-demo.com | Eva Martinez | Member | Customer Support |
| invited@dossier-demo.com | Invited Member | Member | Engineering (Pending invite) |

### Report History

- ~3 weeks of daily reports for all confirmed users
- Realistic patterns: weekdays only, ~85% completion rate
- Mix of on-time and late submissions
- Variety of accomplishments, blockers, and notes

---

## Demo Credentials Summary

```
Password for all confirmed demo accounts: demo123!

Owner:      owner@dossier-demo.com
Admin:      hr@dossier-demo.com
Manager:    eng.lead@dossier-demo.com
            design.lead@dossier-demo.com
            sales.lead@dossier-demo.com
Member:     alice@dossier-demo.com
            bob@dossier-demo.com
            carol@dossier-demo.com
            dave@dossier-demo.com
            eva@dossier-demo.com
```

---

## Script Options

### Seed Everything (Default)
```bash
npm run seed-demo
```
Creates departments, users, assigns managers, and generates report history.

### Reset and Reseed
```bash
npm run seed-demo:reset
```
Deletes all demo users and their data, then creates fresh demo data.

### Reports Only
```bash
npx tsx scripts/seed-demo.ts --reports
```
Only generates reports for existing demo users (skips user creation).

---

## Prerequisites

1. **Supabase Project** with migrations applied
2. **Environment file** (`.env.local`) with required variables
3. An organization row whose `slug` matches `SEED_ORG_SLUG` (default: `acme`)

### Setting Up Environment Variables

Create a `.env.local` file in your project root:

```bash
# .env.local (automatically loaded, not committed to git)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional — defaults to "acme"
# SEED_ORG_SLUG=acme
```

Get these values from: **Supabase Dashboard → Project Settings → API**

The scripts automatically load environment variables from these files (in priority order):
1. `.env.local` (highest priority)
2. `.env.development.local`
3. `.env.development`
4. `.env` (lowest priority)

---

## Idempotency

The seeder is safe to run multiple times:
- Existing departments are skipped
- Existing users are skipped
- Existing reports for a date are skipped
- Only missing data is created

---

## Testing Different Scenarios

### As Admin
1. Sign in as `hr@dossier-demo.com`
2. View organization overview
3. Manage employees (invite, edit, archive)
4. Manage departments
5. View organization-wide analytics

### As Manager
1. Sign in as `eng.lead@dossier-demo.com`
2. View team dashboard and completion rates
3. Browse team reports by date
4. View missing reports
5. View individual employee profiles

### As Employee
1. Sign in as `alice@dossier-demo.com`
2. View personal dashboard and streak
3. Submit today's report
4. View report history

### Testing Invitations
1. Sign in as admin
2. Navigate to Employees or Invitations page
3. Click "Invite Link" for `invited@dossier-demo.com`
4. Click "Generate Invite Link" to create a fresh link
5. Copy the link
6. Open in incognito/new browser
7. Complete the signup flow (set password)

---

## Cleaning Up

### Remove All Demo Data
```bash
npm run seed-demo:reset
```

### Manual Cleanup via SQL
```sql
-- Find all demo users (emails live in auth.users)
SELECT id, email FROM auth.users WHERE email LIKE '%@dossier-demo.com';

-- Delete via Supabase Dashboard → Authentication → Users
-- Or use the recovery CLI:
-- npx tsx scripts/recovery-cli.ts list-admins
```

---

## Troubleshooting

### "Missing required environment variables"
Create a `.env.local` file in your project root with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. See [Prerequisites](#prerequisites) above.

### "Organization slug 'acme' not found"
Create an organization with slug `acme`, or run with `SEED_ORG_SLUG` set to your existing org slug.

### "Failed to create user: email_exists"
The user already exists. This is fine — the seeder will continue with other users.

### "Profile update failed"
The user was created but profile couldn't be updated. The `handle_new_user` trigger may need more time. Re-run the seeder.

### Reports not showing
Make sure the user is confirmed (not pending). Check that `report_date` matches your timezone expectations.

---

## Security Notes

- Demo users use the `@dossier-demo.com` domain to avoid colliding with real addresses
- Demo password is intentionally simple for testing
- **Never run this on production** without understanding the implications
- The service role key has full database access — keep it secret

---

## Related Documentation

- [Emergency Recovery](./EMERGENCY_RECOVERY.md) — Recover locked admin accounts
- [Manual Testing Guide](./internal/MANUAL_TESTING_GUIDE.md) — QA checklist and scenarios
- [Development Guide](./DEVELOPMENT_GUIDE.md) — Local setup instructions
