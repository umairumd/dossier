-- Inoma Hub Emergency Recovery Procedures
-- ========================================
--
-- Use these procedures ONLY when locked out of the application.
-- All commands require Supabase Dashboard SQL Editor or direct database access.
--
-- IMPORTANT: These bypass normal application security. Use with caution.

-- ============================================================================
-- PROCEDURE 1: Promote an existing user to admin
-- ============================================================================
-- Use when: All admins are locked out but other users exist
-- Prerequisites: Know the email of a trusted user to promote

-- Step 1: Find the user's profile ID
SELECT id, full_name, email, role, is_active, archived_at
FROM profiles
WHERE email = 'user@example.com';  -- Replace with actual email

-- Step 2: Promote to admin and ensure active
UPDATE profiles
SET role = 'admin',
    is_active = true,
    archived_at = null
WHERE email = 'user@example.com';  -- Replace with actual email

-- ============================================================================
-- PROCEDURE 2: List all admins and their status
-- ============================================================================
-- Use when: Diagnosing who has admin access

SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  p.archived_at,
  CASE
    WHEN p.archived_at IS NOT NULL THEN 'archived'
    WHEN NOT p.is_active THEN 'deactivated'
    ELSE 'active'
  END as status
FROM profiles p
WHERE p.role = 'admin'
ORDER BY p.is_active DESC, p.archived_at NULLS FIRST;

-- ============================================================================
-- PROCEDURE 3: Reactivate a deactivated admin
-- ============================================================================
-- Use when: Admin was deactivated but not archived
-- Note: Also requires unbanning in Supabase Auth (see docs/EMERGENCY_RECOVERY.md)

-- Step 1: Update profile
UPDATE profiles
SET is_active = true
WHERE id = '00000000-0000-0000-0000-000000000000';  -- Replace with user UUID

-- Step 2: CRITICAL - Also unban in Supabase Auth Dashboard:
-- Authentication > Users > Find user > Unban
-- Without this, the user cannot log in even if profile.is_active = true

-- ============================================================================
-- PROCEDURE 4: Restore an archived admin
-- ============================================================================
-- Use when: Admin was archived and needs full restoration

-- Step 1: Update profile
UPDATE profiles
SET is_active = true,
    archived_at = null
WHERE id = '00000000-0000-0000-0000-000000000000';  -- Replace with user UUID

-- Step 2: CRITICAL - Also unban in Supabase Auth Dashboard

-- ============================================================================
-- PROCEDURE 5: Create emergency admin from scratch
-- ============================================================================
-- Use when: No users exist or all are compromised
-- DANGER: This creates an account without proper Auth flow
--
-- Recommended approach: Use Supabase Dashboard instead
-- 1. Authentication > Users > Add user (email + password)
-- 2. Copy the new user's UUID
-- 3. Run the UPDATE below

UPDATE profiles
SET role = 'admin',
    is_active = true,
    archived_at = null,
    full_name = 'Emergency Admin'  -- Update as needed
WHERE id = '00000000-0000-0000-0000-000000000000';  -- UUID from step 2

-- ============================================================================
-- PROCEDURE 6: Audit recent admin changes
-- ============================================================================
-- Use when: Investigating how admin access was lost
-- Note: This only shows current state, not a full audit log

SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  p.archived_at,
  p.created_at,
  p.updated_at
FROM profiles p
WHERE p.role = 'admin'
   OR p.updated_at > NOW() - INTERVAL '7 days'
ORDER BY p.updated_at DESC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check admin count (should be >= 1)
SELECT COUNT(*) as admin_count
FROM profiles
WHERE role = 'admin'
  AND is_active = true
  AND archived_at IS NULL;

-- Verify specific user can log in
SELECT
  p.id,
  p.full_name,
  p.role,
  p.is_active,
  p.archived_at IS NULL as not_archived,
  (p.is_active AND p.archived_at IS NULL) as can_access_app
FROM profiles p
WHERE p.email = 'admin@example.com';  -- Replace with email
