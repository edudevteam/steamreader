-- ============================================================================
-- Fix 02 — multiple authors per article
-- ============================================================================
-- Articles carried exactly one byline (`articles.author_id`). Student work is
-- often collaborative, so an article now has one PRIMARY author plus an
-- ordered list of co-authors.
--
-- Shape of the change:
--
--   * `articles.author_id` keeps its meaning -- the primary author, and the
--     only non-staff account that may reassign, delete, or change sharing.
--     Nothing that already reads `author_id` needs to change.
--   * `article_authors` holds the co-authors, ordered.
--   * `articles.co_authors_can_edit` is off by default: a co-author is a
--     CREDIT only. The primary author (or staff) may flip it on per article
--     to let co-authors edit the draft too.
--
-- Publishing is untouched -- `enforce_publish_permission` still means only
-- editors and admins can put anything live, co-author or not.
--
-- Already folded into cms-schema.sql for fresh installs.
--
-- ORDER: run this BEFORE fix-05 -- the numbered order anyway. Helpers are
-- created in `public` because that is where the rest of them live at this
-- point in the chain; fix-05 then moves the whole set into `private` and
-- already knows about the three added here. cms-schema.sql, having no history
-- to migrate, creates them in `private` directly.
--
-- Re-runnable up until fix-05 has been applied. After that the helpers are no
-- longer in `public` and re-running this would recreate them in the wrong
-- schema, so re-run fix-05 too if you ever need to.
-- ============================================================================


-- ============================================
-- SCHEMA
-- ============================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS co_authors_can_edit BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS article_authors (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_article_authors_author ON article_authors(author_id);

GRANT SELECT ON article_authors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON article_authors TO authenticated;


-- ============================================
-- HELPERS
-- ============================================
-- All SECURITY DEFINER, like the role helpers above them: a policy on
-- `articles` that reads `article_authors` would otherwise re-enter that
-- table's own RLS on every row. And in `private` for the same reason as those,
-- so they carry the EXECUTE that RLS needs without gaining a REST route.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_article_primary_author(target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = target AND a.author_id = (SELECT auth.uid())
  );
$$;

-- Credited as a co-author, whether or not editing is switched on.
CREATE OR REPLACE FUNCTION public.is_article_co_author(target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.article_authors aa
    WHERE aa.article_id = target AND aa.author_id = (SELECT auth.uid())
  );
$$;

-- Co-author AND the primary author has opted this article into shared editing.
CREATE OR REPLACE FUNCTION public.can_edit_as_co_author(target UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.article_authors aa
    JOIN public.articles a ON a.id = aa.article_id
    WHERE aa.article_id = target
      AND aa.author_id = (SELECT auth.uid())
      AND a.co_authors_can_edit
  );
$$;


-- Take back the implicit PUBLIC grant Postgres puts on every new function, so
-- these do not surface at /rest/v1/rpc/*.
REVOKE ALL ON FUNCTION public.is_article_primary_author(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_article_co_author(UUID)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_as_co_author(UUID)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_article_primary_author(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_article_co_author(UUID)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_as_co_author(UUID)     TO authenticated, service_role;


-- ============================================
-- ARTICLE_AUTHORS RLS
-- ============================================
ALTER TABLE article_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read article authors"      ON article_authors;
DROP POLICY IF EXISTS "Primary author manages co-authors" ON article_authors;
DROP POLICY IF EXISTS "Staff manage co-authors"           ON article_authors;

-- Bylines are public, so the join rows must be readable by anon -- the same
-- reasoning as `article_tags`. Names still come from `profiles`, which only
-- exposes contributor rows and never email.
CREATE POLICY "Public read article authors" ON article_authors
  FOR SELECT USING (true);

-- Deliberately the PRIMARY author only: a co-author with edit rights must not
-- be able to recruit further co-authors.
CREATE POLICY "Primary author manages co-authors" ON article_authors
  FOR ALL TO authenticated
  USING (public.is_article_primary_author(article_id))
  WITH CHECK (public.is_article_primary_author(article_id));

CREATE POLICY "Staff manage co-authors" ON article_authors
  FOR ALL TO authenticated
  USING (public.is_editor()) WITH CHECK (public.is_editor());


-- ============================================
-- ARTICLES RLS -- co-author access
-- ============================================
DROP POLICY IF EXISTS "Co-authors read editable articles"   ON articles;
DROP POLICY IF EXISTS "Co-authors update editable articles" ON articles;

-- Gated on the toggle, not on mere credit: a credit-only co-author has no
-- business reading an unpublished draft. Once published, the public policy
-- covers them like any other reader.
CREATE POLICY "Co-authors read editable articles" ON articles
  FOR SELECT TO authenticated USING (public.can_edit_as_co_author(id));

CREATE POLICY "Co-authors update editable articles" ON articles
  FOR UPDATE TO authenticated
  USING (public.can_edit_as_co_author(id))
  WITH CHECK (public.can_edit_as_co_author(id));

-- No matching DELETE policy: retracting an article stays with the primary
-- author and staff.


-- ============================================
-- ARTICLE_TAGS RLS -- follow co-author access
-- ============================================
-- Tag rows follow the permissions of the article they hang off, so a co-author
-- who may edit the body may also retag it.
DROP POLICY IF EXISTS "Authors manage own article tags" ON article_tags;

CREATE POLICY "Authors manage own article tags" ON article_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
    )
    OR public.can_edit_as_co_author(article_tags.article_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
    )
    OR public.can_edit_as_co_author(article_tags.article_id)
  );


-- ============================================
-- OWNERSHIP GUARD
-- ============================================
-- Two escalations RLS cannot express, because a policy cannot see OLD:
--
--   1. A co-author with edit rights setting `author_id` to themselves and
--      taking the article over.
--   2. A co-author switching `co_authors_can_edit` on for an article whose
--      primary author had left it off.
--
-- Both are UPDATEs the co-author policy would otherwise allow, so they are
-- caught here instead.
CREATE OR REPLACE FUNCTION public.enforce_article_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- No signed-in user means service_role or a direct SQL session, both of
  -- which already bypass RLS. This guard backstops the co-author policies, so
  -- it must not be stricter than they are -- the admin-users function reassigns
  -- articles with service_role when deleting an account, and a trigger that
  -- fired there would break that path.
  IF (SELECT auth.uid()) IS NULL OR public.is_editor() THEN
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
$$;

DROP TRIGGER IF EXISTS trigger_enforce_article_ownership ON articles;
CREATE TRIGGER trigger_enforce_article_ownership
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_article_ownership();


-- ============================================
-- VIEWS
-- ============================================
-- Dependency order matters: search_articles returns SETOF article_list, and
-- article_detail selects from it, so both have to go before the view can be
-- replaced.
DROP FUNCTION IF EXISTS public.search_articles(TEXT);
DROP VIEW IF EXISTS article_detail;
DROP VIEW IF EXISTS article_list;

CREATE VIEW article_list
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.slug,
  a.title,
  a.subtitle,
  a.excerpt,
  a.status,
  a.published_at,
  a.updated_at,
  a.created_at,
  a.reading_time,
  a.feature_image,
  a.validation,
  a.previous_slug,
  a.next_slug,
  a.author_id,
  p.slug         AS author_slug,
  p.display_name AS author_name,
  a.co_authors_can_edit,
  -- Full byline, primary first then co-authors in their chosen order. Kept
  -- alongside the author_* columns rather than replacing them so every
  -- existing query, filter and sort keeps working untouched.
  COALESCE(
    (
      SELECT jsonb_agg(byline.entry ORDER BY byline.ord, byline.name)
      FROM (
        SELECT
          0 AS ord,
          pp.display_name AS name,
          jsonb_build_object(
            'id', pp.id, 'slug', pp.slug, 'name', pp.display_name,
            'is_primary', true
          ) AS entry
        FROM profiles pp
        WHERE pp.id = a.author_id
        UNION ALL
        SELECT
          1 + aa.sort_order,
          pp.display_name,
          jsonb_build_object(
            'id', pp.id, 'slug', pp.slug, 'name', pp.display_name,
            'is_primary', false
          )
        FROM article_authors aa
        JOIN profiles pp ON pp.id = aa.author_id
        WHERE aa.article_id = a.id
          -- Defensive: the primary author must never appear twice, even if a
          -- stale join row survives a reassignment.
          AND aa.author_id IS DISTINCT FROM a.author_id
      ) byline
    ),
    '[]'::jsonb
  ) AS authors,
  a.category_id,
  c.slug         AS category_slug,
  c.name         AS category_name,
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) ORDER BY t.name)
      FROM article_tags at
      JOIN tags t ON t.id = at.tag_id
      WHERE at.article_id = a.id
    ),
    '[]'::jsonb
  ) AS tags
FROM articles a
LEFT JOIN profiles   p ON p.id = a.author_id
LEFT JOIN categories c ON c.id = a.category_id;

GRANT SELECT ON article_list TO anon, authenticated;

CREATE VIEW article_detail
WITH (security_invoker = on) AS
SELECT
  l.*,
  a.content_html,
  a.content_markdown,
  a.toc
FROM article_list l
JOIN articles a ON a.id = l.id;

GRANT SELECT ON article_detail TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_articles(query TEXT)
RETURNS SETOF article_list
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT l.*
  FROM article_list l
  WHERE query IS NULL
     OR query = ''
     OR to_tsvector('english', l.title || ' ' || COALESCE(l.subtitle, '') || ' ' || l.excerpt)
        @@ plainto_tsquery('english', query)
     OR l.title ILIKE '%' || query || '%'
  ORDER BY l.published_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.search_articles(TEXT) TO anon, authenticated;


-- ============================================
-- PUBLIC AUTHOR VIEW
-- ============================================
-- An author page should count everything the reader will actually see listed
-- there, so co-authored articles count too.
DROP VIEW IF EXISTS public_authors;
CREATE VIEW public_authors
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.slug,
  p.display_name AS name,
  p.bio,
  p.avatar_url,
  p.social,
  (
    SELECT COUNT(*)
    FROM articles a
    WHERE a.status = 'published'
      AND (a.published_at IS NULL OR a.published_at <= NOW())
      AND (
        a.author_id = p.id
        OR EXISTS (
          SELECT 1 FROM article_authors aa
          WHERE aa.article_id = a.id AND aa.author_id = p.id
        )
      )
  ) AS article_count
FROM profiles p
WHERE p.is_active AND p.role IN ('admin', 'editor', 'writer');

GRANT SELECT ON public_authors TO anon, authenticated;
