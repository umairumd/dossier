# Inoma Hub — Emergency Recovery Guide

This document describes how to recover from situations where admin access is lost.

---

## Quick Reference

| Situation | Solution |
|-----------|----------|
| Admin forgot password | Use Supabase Dashboard password reset |
| Admin deactivated by another admin | Use recovery CLI or SQL to reactivate |
| Admin archived by another admin | Use recovery CLI or SQL to restore |
| All admins locked out | Promote an existing user or create emergency admin |
| No users exist | Create admin via Supabase Dashboard + SQL |

---

## Prerequisites

For CLI-based recovery:
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Find these in: Supabase Dashboard → Project Settings → API

---

## Recovery Procedures

### 1. Password Reset (No Admin Action Needed)

If an admin simply forgot their password and email is configured:

1. Go to the login page
2. Click "Forgot Password" (if implemented)
3. Or use Supabase Dashboard: **Authentication → Users → [user] → Send password recovery**

### 2. Reactivate a Deactivated Admin

A deactivated user has `is_active = false` and is banned in Supabase Auth.

**Using CLI:**
```bash
npx tsx scripts/recovery-cli.ts reactivate admin@company.com
```

**Using SQL + Dashboard:**
```sql
-- 1. Find the user
SELECT id, full_name, email, is_active FROM profiles WHERE email = 'admin@company.com';

-- 2. Set profile active
UPDATE profiles SET is_active = true WHERE email = 'admin@company.com';
```
Then in Supabase Dashboard: **Authentication → Users → [user] → Unban**

### 3. Restore an Archived Admin

An archived user has `archived_at` set and is banned.

**Using CLI:**
```bash
npx tsx scripts/recovery-cli.ts restore admin@company.com
```

**Using SQL + Dashboard:**
```sql
UPDATE profiles 
SET is_active = true, archived_at = null 
WHERE email = 'admin@company.com';
```
Then in Supabase Dashboard: **Authentication → Users → [user] → Unban**

### 4. Promote an Existing User to Admin

When all admins are locked out but other users can log in:

**Using CLI:**
```bash
npx tsx scripts/recovery-cli.ts promote trusted-user@company.com
```

**Using SQL:**
```sql
UPDATE profiles 
SET role = 'admin', is_active = true, archived_at = null 
WHERE email = 'trusted-user@company.com';
```

### 5. Create Emergency Admin (No Users Available)

When no existing users can be promoted:

**Using CLI:**
```bash
npx tsx scripts/recovery-cli.ts create-admin \
  emergency@company.com \
  "Emergency Admin" \
  "SecurePassword123!"
```

**Using Dashboard + SQL:**

1. In Supabase Dashboard: **Authentication → Users → Add user**
   - Enter email and password
   - Click "Auto Confirm User"
2. Copy the new user's UUID
3. Run SQL:
```sql
UPDATE profiles 
SET role = 'admin', full_name = 'Emergency Admin' 
WHERE id = 'paste-uuid-here';
```

---

## Understanding the Deactivation Mechanism

Inoma Hub uses two systems for access control:

1. **Supabase Auth ban** — Prevents the user from logging in at all
2. **Profile `is_active` flag** — Checked by the app after login

When a user is deactivated or archived, both are set. Recovery must address both:

| Action | Auth Ban | Profile `is_active` | Profile `archived_at` |
|--------|----------|---------------------|----------------------|
| Deactivate | Set to 1 year | `false` | unchanged |
| Archive | Set to 1 year | `false` | timestamp |
| Reactivate | Cleared | `true` | unchanged |
| Restore | Cleared | `true` | `null` |

---

## CLI Command Reference

```bash
# List all admins and their status
npx tsx scripts/recovery-cli.ts list-admins

# Promote existing user to admin
npx tsx scripts/recovery-cli.ts promote user@company.com

# Reactivate deactivated user (unban + set active)
npx tsx scripts/recovery-cli.ts reactivate user@company.com

# Restore archived user (unban + set active + clear archive)
npx tsx scripts/recovery-cli.ts restore user@company.com

# Only unban (doesn't change profile)
npx tsx scripts/recovery-cli.ts unban user@company.com

# Create new admin user
npx tsx scripts/recovery-cli.ts create-admin email name password
```

---

## SQL Scripts Location

Additional SQL procedures are available in `scripts/emergency-recovery.sql`:
- Audit queries
- Verification queries
- Batch operations

---

## Prevention Best Practices

1. **Always have 2+ active admins** — The app prevents deactivating the last admin, but accidents happen
2. **Document admin accounts** — Keep a secure record of who has admin access
3. **Test password reset** — Ensure email is configured before you need it
4. **Secure the service role key** — Anyone with this key has full database access

---

## Verification

After recovery, verify the admin can access the app:

```sql
SELECT
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  p.archived_at IS NULL as not_archived,
  (p.is_active AND p.archived_at IS NULL) as should_have_access
FROM profiles p
WHERE p.email = 'admin@company.com';
```

All three boolean columns should be `true` for full access.

---

## Getting Help

If these procedures don't resolve your issue:

1. Check Supabase Dashboard for Auth-level issues
2. Review `profiles` table directly
3. Check application logs for specific error messages
4. Verify environment variables are set correctly
