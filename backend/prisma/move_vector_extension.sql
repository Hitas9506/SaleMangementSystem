-- ============================================================================
-- MOVE VECTOR EXTENSION TO EXTENSIONS SCHEMA
-- ============================================================================
-- Purpose: Fix Supabase warning about extension in public schema
-- Effect: Moves pgvector extension to dedicated extensions schema
-- 
-- IMPORTANT: 
-- - This is a best practice recommended by Supabase
-- - Backend API will continue to work normally
-- - No impact on existing vector data or queries
-- ============================================================================

-- Step 1: Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the extension has been moved:

-- Check extension location
SELECT 
    e.extname as extension_name,
    n.nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'vector';

-- Expected result: extension_name = 'vector', schema_name = 'extensions'

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. After running this script, the Supabase warning will be resolved
-- 2. Your backend API will continue to work normally
-- 3. All existing vector data and embeddings remain intact
-- 4. No changes needed in application code
-- 5. This is a one-time operation
-- ============================================================================
