-- =========================================
-- STEP 1: Create Read-Only User in GPai Production Database
-- =========================================
-- Run this on your GPai PRODUCTION database
-- This creates a user that can ONLY read data, cannot modify anything

-- Replace 'YOUR_SECURE_PASSWORD_HERE' with a strong password
-- Save this password - you'll need it for the Vercel environment variables
CREATE ROLE comp_ro LOGIN PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- Grant permissions (READ ONLY)
GRANT CONNECT ON DATABASE production TO comp_ro;
GRANT USAGE ON SCHEMA public TO comp_ro;

-- Grant SELECT (read-only) on specific tables we need
GRANT SELECT ON users TO comp_ro;
GRANT SELECT ON user_referral_codes TO comp_ro;
GRANT SELECT ON user_referrals TO comp_ro;
GRANT SELECT ON solver_tasks TO comp_ro;
GRANT SELECT ON user_auth_providers TO comp_ro;

-- Verify the user was created successfully
SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'comp_ro';

-- Test the permissions (should show the granted tables)
SELECT 
    tablename, 
    has_table_privilege('comp_ro', schemaname||'.'||tablename, 'SELECT') as can_read,
    has_table_privilege('comp_ro', schemaname||'.'||tablename, 'INSERT') as can_insert,
    has_table_privilege('comp_ro', schemaname||'.'||tablename, 'UPDATE') as can_update,
    has_table_privilege('comp_ro', schemaname||'.'||tablename, 'DELETE') as can_delete
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'user_referral_codes', 'user_referrals', 'solver_tasks', 'user_auth_providers')
ORDER BY tablename;

-- The result should show:
-- can_read = true
-- can_insert = false  
-- can_update = false
-- can_delete = false