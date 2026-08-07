-- ============================================================================
-- Fix 05 — move the security helpers out of the exposed API schema
-- ============================================================================
-- Symptom: Security Advisor reports, for each of current_user_role, is_admin,
--   is_editor and is_contributor,
--     authenticated_security_definer_function_executable: can be executed by
--     the `authenticated` role via /rest/v1/rpc/<name>
--
-- fix-04 took EXECUTE away from anon. It cannot take it away from
-- `authenticated`: RLS policy expressions are evaluated with the querying
-- user's privileges, so every signed-in read of `articles` needs EXECUTE on
-- is_editor(). Revoking it would lock the CMS out of its own tables.
--
-- Fix: keep the privilege, remove the endpoint. PostgREST only publishes the
-- schemas it is configured with (`public`, `graphql_public`), so a helper in a
-- `private` schema has no REST route at all -- while policies keep working,
-- because a policy stores the function's OID, not its name, and the OID is
-- unchanged by a schema move.
--
-- WHAT DOES NOT SURVIVE THE MOVE, and is therefore rewritten below: function
-- BODIES are stored as text and re-resolved at call time. Six references
-- resolve by name --
--   * is_admin / is_editor / is_contributor  -> call current_user_role()
--   * enforce_publish_permission             -> calls is_editor()
--   * enforce_article_ownership              -> calls is_editor()
-- -- and every one of them is fully qualified `public.`, because these
-- functions run with `SET search_path = ''`. Each is recreated pointing at
-- `private`. Everything else that references a helper is an RLS policy, which
-- needs no change.
--
-- Nothing in the app calls these over the API: the only .rpc() in the codebase
-- is search_articles, which stays in `public`.
--
-- Runs as one transaction -- helpers are never half-moved. Safe to re-run.
-- ============================================================================

BEGIN;


-- ============================================
-- 1. THE PRIVATE SCHEMA
-- ============================================
-- Not listed in PostgREST's exposed schemas, so nothing in here is reachable
-- over REST regardless of its grants. USAGE goes only to the roles that
-- evaluate policies; anon is deliberately absent, matching fix-04.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;


-- ============================================
-- 2. MOVE THE HELPERS
-- ============================================
-- Guarded by to_regprocedure so this is re-runnable, and so it tolerates a
-- database where fix-02 has not been applied and the byline helpers do not
-- exist yet. EXECUTE grants travel with the function.
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
      EXECUTE format('ALTER FUNCTION %s SET SCHEMA private', fn);
    END IF;
  END LOOP;
END $$;


-- ============================================
-- 3. REPOINT THE BODIES THAT NAME A HELPER
-- ============================================
-- The three derived role helpers. Same definitions as before, one word
-- changed: `public.current_user_role()` -> `private.current_user_role()`,
-- which no longer resolves under `search_path = ''` now that it has moved.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION private.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() IN ('admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION private.is_contributor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() IN ('admin', 'editor', 'writer');
$$;


-- The trigger functions stay in `public` -- they are attached to triggers
-- there, fix-04 already took their EXECUTE away, and the advisor no longer
-- flags them. Only their calls to is_editor() need repointing.
CREATE OR REPLACE FUNCTION public.enforce_publish_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NOT private.is_editor() THEN
    RAISE EXCEPTION 'Only editors and admins can publish articles'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_publish_permission() FROM PUBLIC, anon, authenticated;


-- Only present once fix-02 has been applied.
DO $$
BEGIN
  IF to_regprocedure('public.enforce_article_ownership()') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.enforce_article_ownership()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
      BEGIN
        -- Mirrors fix-02: service_role and direct SQL sessions already bypass
        -- RLS, so this guard must not be stricter than the policies it backs.
        IF (SELECT auth.uid()) IS NULL OR private.is_editor() THEN
          RETURN NEW;
        END IF;

        IF NEW.author_id IS DISTINCT FROM OLD.author_id
           AND OLD.author_id IS DISTINCT FROM (SELECT auth.uid()) THEN
          RAISE EXCEPTION 'Only the primary author or an editor can reassign an article'
            USING ERRCODE = '42501';
        END IF;

        IF NEW.co_authors_can_edit IS DISTINCT FROM OLD.co_authors_can_edit
           AND OLD.author_id IS DISTINCT FROM (SELECT auth.uid()) THEN
          RAISE EXCEPTION 'Only the primary author or an editor can change co-author editing'
            USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
      END;
      $body$;
    $fn$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.enforce_article_ownership() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;


-- ============================================
-- 4. RE-ASSERT GRANTS
-- ============================================
-- CREATE OR REPLACE preserves an existing ACL, but state this outright so the
-- end state does not depend on what fix-04 happened to leave behind.
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'private.current_user_role()',
    'private.is_admin()',
    'private.is_editor()',
    'private.is_contributor()',
    'private.is_article_primary_author(uuid)',
    'private.is_article_co_author(uuid)',
    'private.can_edit_as_co_author(uuid)'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    END IF;
  END LOOP;
END $$;


COMMIT;


-- ============================================================================
-- VERIFY -- run separately after committing.
-- ============================================================================
-- Expect: four rows, all in schema `private`, and no rows in `public`.
--
--   SELECT n.nspname, p.proname
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE p.proname IN ('current_user_role','is_admin','is_editor','is_contributor')
--   ORDER BY 1, 2;
--
-- Expect: every policy below still renders `private.is_editor()` etc, proving
-- the OID references followed the move rather than dangling.
--
--   SELECT tablename, policyname, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND qual LIKE '%is_editor%'
--   ORDER BY tablename, policyname;
-- ============================================================================
