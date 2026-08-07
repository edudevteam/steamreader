-- ============================================================================
-- Fix 01 — let readers resolve article bylines
-- ============================================================================
-- Symptom: every listing page returns
--   {"code":"42501","message":"permission denied for table profiles"}
--
-- Cause: `article_list` runs with security_invoker = on and joins `profiles`,
-- but the original migration revoked anon's access to that table to protect
-- email addresses. Logged-out visitors therefore could not read any article,
-- and logged-in readers would have seen every byline blank, because the only
-- policies covering them matched their own row.
--
-- Fix: grant the byline columns to both browser roles and nothing else, then
-- add a row policy so contributor rows -- and only those -- are visible.
-- `email` and `birthdate` stay revoked, so `select=*` errors rather than
-- leaking them. Staff read addresses through the admin-users Edge Function,
-- which holds service_role and verifies the caller is an admin first.
--
-- Safe to re-run. Already folded into cms-schema.sql for fresh installs.
-- ============================================================================

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (id, slug, display_name, bio, avatar_url, social, role, is_active, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view contributor profiles" ON profiles;

CREATE POLICY "Public can view contributor profiles" ON profiles
  FOR SELECT TO anon, authenticated
  USING (is_active AND role IN ('admin', 'editor', 'writer'));
