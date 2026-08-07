-- ============================================================================
-- Fix 04 — clear the actionable Security Advisor warnings
-- ============================================================================
-- Three unrelated findings, none of which the site's behaviour depends on:
--
--   1. public_bucket_allows_listing        -- `article-images`
--   2. anon_security_definer_function_executable  -- trigger functions
--   3. anon_security_definer_function_executable  -- role helpers
--
-- What is deliberately NOT changed here is the pg_graphql exposure pair
-- (lints 0026 / 0027) covering articles, categories, tags, courses, profiles
-- and the public views. Those objects are readable by anon *by design* -- this
-- is a publishing site, and its whole public surface is exactly that data.
-- Revoking SELECT would take the site offline. RLS plus the column grant on
-- `profiles` is the real boundary there, and both are already in place.
--
-- Safe to re-run.
-- ============================================================================


-- ============================================
-- 1. STORAGE: stop anon from listing the bucket
-- ============================================
-- `article-images` is a public bucket, so object URLs are served straight from
-- the CDN without consulting RLS -- the app only ever calls getPublicUrl(), and
-- nothing in it calls .list(). The broad SELECT policy therefore buys the
-- reader nothing and costs a full file listing: anyone with the anon key could
-- enumerate every upload, including images attached to unpublished drafts.
--
-- Scope it to contributors instead, so a future admin media browser still works
-- while the public keeps exactly the access it actually uses.
DROP POLICY IF EXISTS "Public read article images"       ON storage.objects;
DROP POLICY IF EXISTS "Contributors list article images" ON storage.objects;

CREATE POLICY "Contributors list article images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'article-images' AND public.is_contributor());


-- ============================================
-- 2. TRIGGER FUNCTIONS: not RPC endpoints
-- ============================================
-- These run from triggers and were never meant to be reachable at
-- /rest/v1/rpc/*. Postgres checks EXECUTE when a trigger is *created*, not each
-- time it fires, so revoking here does not stop the triggers.
--
-- The revoke has to hit PUBLIC: every function is created with EXECUTE granted
-- to PUBLIC, so revoking from `anon` alone leaves the privilege inherited.
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.handle_user_confirmed()',
    'public.enforce_publish_permission()',
    'public.enforce_article_ownership()',
    'public.auto_insert_read_vote()',
    'public.touch_updated_at()'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;


-- ============================================
-- 3. ROLE HELPERS: signed-in callers only
-- ============================================
-- Every policy that calls these is `TO authenticated`, so a logged-out request
-- never evaluates them -- anon can lose EXECUTE without breaking a single read.
-- RLS expressions run with the querying user's privileges, so `authenticated`
-- must keep EXECUTE; that half of the finding (lint 0029) stays, correctly.
--
-- Little is lost by leaving them callable while signed in: is_editor() and
-- friends only ever report on the caller's own role.
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.current_user_role()',
    'public.is_admin()',
    'public.is_editor()',
    'public.is_contributor()',
    'public.is_article_primary_author(uuid)',
    'public.is_article_co_author(uuid)',
    'public.can_edit_as_co_author(uuid)'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;
END $$;
