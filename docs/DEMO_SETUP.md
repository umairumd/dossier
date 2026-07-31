# Inoma Hub — Demo Environment Setup

This guide explains how to set up a complete demo environment for testing Inoma Hub.

---

## Quick Start

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the demo seeder
npm run seed-demo
```

---

## What Gets Created

### Departments

| Department | Manager |
|------------|---------|
| Engineering | Sarah Chen |
| Design | Marcus Johnson |
| Sales | (unassigned) |
| Customer Support | (unassigned) |

### Users

All demo users use the password: **`demo123!`**

| Email | Name | Role | Department |
|-------|------|------|------------|
| admin@demo.inoma.local | Demo Admin | Admin | - |
| eng.manager@demo.inoma.local | Sarah Chen | Manager | Engineering |
| design.manager@demo.inoma.local | Marcus Johnson | Manager | Design |
| alice@demo.inoma.local | Alice Rivera | Employee | Engineering |
| bob@demo.inoma.local | Bob Patel | Employee | Engineering |
| carol@demo.inoma.local | Carol Williams | Employee | Design |
| dave@demo.inoma.local | Dave Kim | Employee | Sales |
| eva@demo.inoma.local | Eva Martinez | Employee | Customer Support |
| pending@demo.inoma.local | Pending Pete | Employee | Sales (Pending invite) |

### Report History

- ~3 weeks of daily reports for all confirmed users
- Realistic patterns: weekdays only, ~85% completion rate
- Mix of on-time and late submissions
- Variety of accomplishments, blockers, and notes

---

## Demo Credentials Summary

```
Password for all demo accounts: demo123!

Admin:      admin@demo.inoma.local
Manager:    eng.manager@demo.inoma.local
            design.manager@demo.inoma.local
Employee:   alice@demo.inoma.local
            bob@demo.inoma.local
            carol@demo.inoma.local
            dave@demo.inoma.local
            eva@demo.inoma.local
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
2. **Environment Variables** set:
   - `SUPABASE_URL` — Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (from Dashboard → Settings → API)

### Setting Environment Variables

**Option 1: Export in shell**
```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

**Option 2: Create `.env.local`**
```bash
# .env.local (don't commit this file!)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Then load with: `source .env.local && npm run seed-demo`

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
1. Sign in as `admin@demo.inoma.local`
2. View organization overview
3. Manage employees (invite, edit, archive)
4. Manage departments
5. View organization-wide analytics

### As Manager
1. Sign in as `eng.manager@demo.inoma.local`
2. View team dashboard and completion rates
3. Browse team reports by date
4. View missing reports
5. View individual employee profiles

### As Employee
1. Sign in as `alice@demo.inoma.local`
2. View personal dashboard and streak
3. Submit today's report
4. View report history

### Testing Invitations
1. Sign in as admin
2. Copy the invite link for `pending@demo.inoma.local`
3. Open in incognito/new browser
4. Complete the signup flow

---

## Cleaning Up

### Remove All Demo Data
```bash
npm run seed-demo:reset
```

### Manual Cleanup via SQL
```sql
-- Find all demo users
SELECT id, email FROM profiles WHERE email LIKE '%@demo.inoma.local';

-- Delete via Supabase Dashboard → Authentication → Users
-- Or use the recovery CLI:
-- npx tsx scripts/recovery-cli.ts list-admins
```

---

## Troubleshooting

### "Missing environment variables"
Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in your shell.

### "Failed to create user: email_exists"
The user already exists. This is fine — the seeder will continue with other users.

### "Profile update failed"
The user was created but profile couldn't be updated. The `handle_new_user` trigger may need more time. Re-run the seeder.

### Reports not showing
Make sure the user is confirmed (not pending). Check that `report_date` matches your timezone expectations.

---

## Security Notes

- Demo users use `.local` domain to prevent accidental real emails
- Demo password is intentionally simple for testing
- **Never run this on production** without understanding the implications
- The service role key has full database access — keep it secret

---

## Related Documentation

- [Emergency Recovery](./EMERGENCY_RECOVERY.md) — Recover locked admin accounts
- [Manual Testing Guide](./MANUAL_TESTING_GUIDE.md) — QA checklist and scenarios
- [Development Guide](./DEVELOPMENT_GUIDE.md) — Local setup instructions
