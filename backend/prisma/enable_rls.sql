-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- ============================================================================
-- Purpose: Fix Supabase security warnings by enabling RLS on all tables
-- Effect: Blocks PostgREST API access while allowing backend (service role) access
-- 
-- IMPORTANT: 
-- - Service role key bypasses RLS, so backend API continues to work normally
-- - No RLS policies are created, so PostgREST API will be blocked
-- - This is the recommended approach for apps that don't use PostgREST
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify RLS is enabled on all tables:

-- Check RLS status for all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected result: All tables should have rls_enabled = true

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. After running this script, all Supabase security warnings will be resolved
-- 2. Your backend API will continue to work normally (service role bypasses RLS)
-- 3. PostgREST API will be blocked (no policies = no access)
-- 4. If you need to add RLS policies in the future, you can do so without issues
-- ============================================================================
