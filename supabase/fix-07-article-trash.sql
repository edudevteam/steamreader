-- ============================================================================
-- Fix 07 — send deleted articles to a trash first
-- ============================================================================
-- Deleting an article was immediate and irreversible: the row went, and
-- `article_votes` went with it through ON DELETE CASCADE. A misclick cost a
-- published article and every vote it had earned.
--
-- Shape of the change:
--
--   * `articles.deleted_at` marks an article as trashed. It is NOT a status --
--     `status` already means draft/in_review/published/archived, and the point
--     of a trash is that restoring puts the article back exactly as it was,
--     which means remembering what it was.
--   * Trashing is an UPDATE, so nothing cascades and nothing is lost.
--   * The DELETE policies now require `deleted_at IS NOT NULL`, so the only
--     route to a hard delete is through the trash.
--   * Every public-facing view filters trashed rows out, so a trashed article
--     disappears from the site the moment it is trashed -- including one that
--     was published.
--
-- WHO MAY TRASH WHAT is deliberately identical to who could DELETE what
-- before this change: staff may trash anything, a writer may trash only their
-- own draft or in-review work. Without that, moving the operation from DELETE
-- to UPDATE would quietly hand writers the power to pull a live article down,
-- which the DELETE policy had always denied them. The ownership trigger
-- enforces it, because RLS cannot see OLD.
--
-- NOT DONE HERE, on purpose:
--   * No auto-purge. The trash keeps rows until someone empties it.
--   * Destroying an article does not delete its R2 feature image. Images are
--     shared between articles, so chasing them is not safe to automate.
--
-- ORDER: run AFTER fix-05 -- the ownership trigger recreated in section 4
-- calls `private.is_editor()`, which is where fix-05 leaves it.
--
-- Runs as one transaction. Safe to re-run.
-- ============================================================================

BEGIN;


-- ============================================
-- 1. THE COLUMNS
-- ============================================
-- `deleted_by` is stamped by the trigger in section 4, never by the client, so
-- it records who actually did it rather than who claimed to.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_by UUID
  REFERENCES profiles(id) ON DELETE SET NULL;

-- Partial: the trash is a small fraction of the table, and every other query
-- in the schema wants `deleted_at IS NULL`, which this index cannot serve
-- anyway. It exists for the Trash page's one listing query.
CREATE INDEX IF NOT EXISTS idx_articles_trashed
  ON articles(deleted_at DESC) WHERE deleted_at IS NOT NULL;


-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================
-- Only the public SELECT policy changes. Authors, co-authors and staff keep
-- reading their trashed rows -- that is what the Trash page lists, and what
-- makes a restore possible. Hiding them from the normal lists is the views'
-- job, in section 5.
--
-- This has to happen at the policy and not only in the views: `articles` is an
-- exposed table, so anon can read it directly at /rest/v1/articles. Filtering
-- only in `article_list` would leave a trashed published article fetchable by
-- anyone who asked for it by name.
DROP POLICY IF EXISTS "Public read published" ON articles;

CREATE POLICY "Public read published" ON articles
  FOR SELECT USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= NOW())
    AND deleted_at IS NULL
  );

-- A hard delete is now only reachable for something already in the trash.
-- The status test on the writer policy stays: a writer whose draft is in the
-- trash may destroy it; a published article in the trash is staff-only, the
-- same way trashing it was.
DROP POLICY IF EXISTS "Authors delete own drafts" ON articles;
DROP POLICY IF EXISTS "Staff delete any article" ON articles;

CREATE POLICY "Authors delete own drafts" ON articles
  FOR DELETE TO authenticated
  USING (
    author_id = (select auth.uid())
    AND status IN ('draft', 'in_review')
    AND deleted_at IS NOT NULL
  );

CREATE POLICY "Staff delete any article" ON articles
  FOR DELETE TO authenticated
  USING (private.is_editor() AND deleted_at IS NOT NULL);


-- ============================================
-- 3. THE TRASH VIEW
-- ============================================
-- `article_list` filters trashed rows out, so the Trash page needs its own
-- source. Kept deliberately thin -- the page shows a title, who trashed it and
-- when, and offers Restore or Destroy. It does not need the byline aggregate
-- or the tag rollup.
--
-- Scoped to the accounts that can actually act on the row, so nobody is shown
-- a Restore button that will fail: the primary author, and staff. A co-author
-- with edit rights can read the underlying row but cannot restore it, so the
-- view leaves them out. anon gets no grant at all.
DROP VIEW IF EXISTS article_trash;
CREATE VIEW article_trash
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.slug,
  a.title,
  a.status,
  a.published_at,
  a.deleted_at,
  a.deleted_by,
  d.display_name AS deleted_by_name,
  a.author_id,
  p.display_name AS author_name,
  c.name         AS category_name
FROM articles a
LEFT JOIN profiles   p ON p.id = a.author_id
LEFT JOIN profiles   d ON d.id = a.deleted_by
LEFT JOIN categories c ON c.id = a.category_id
WHERE a.deleted_at IS NOT NULL
  AND (a.author_id = (select auth.uid()) OR private.is_editor());

GRANT SELECT ON article_trash TO authenticated;


-- ============================================
-- 4. THE OWNERSHIP GUARD
-- ============================================
-- Recreated whole, with the trash rules appended. The two escalations it
-- already guarded are unchanged; see cms-schema.sql for their reasoning.
--
-- The new rule closes the gap opened by making "delete" an UPDATE. Before this
-- fix, `articles` had no UPDATE path that could remove an article from the
-- site, so the UPDATE policies could stay broad. Now one exists, and two
-- accounts can reach it that the DELETE policy would have turned away: a
-- co-author with edit rights (whose UPDATE policy says nothing about
-- ownership), and the primary author of a *published* article (whose DELETE
-- policy stopped at drafts). Both are refused here.
--
-- Restoring is checked the same way, against OLD.status -- the status the
-- article will return to. A writer can pull their own draft back out of the
-- trash; putting a published article back on the site stays with staff.
CREATE OR REPLACE FUNCTION public.enforce_article_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Stamp the actor before the early return, so a service_role path -- the
  -- admin-users function reassigning articles, say -- still records a NULL
  -- rather than carrying a stale name from a previous trip through the trash.
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    NEW.deleted_by := CASE
      WHEN NEW.deleted_at IS NULL THEN NULL
      ELSE (SELECT auth.uid())
    END;
  END IF;

  -- No signed-in user means service_role or a direct SQL session, both of
  -- which already bypass RLS. This guard backstops the co-author policies, so
  -- it must not be stricter than they are.
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

  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    IF OLD.author_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Only the primary author or an editor can trash an article'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.status NOT IN ('draft', 'in_review') THEN
      RAISE EXCEPTION 'Only an editor can trash or restore a published article'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- An article sitting in the trash is frozen: edit it after restoring, not
  -- before. Without this a writer could rewrite a trashed article and restore
  -- it, and the version an editor thought they had removed would be gone.
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Restore this article before editing it'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_article_ownership()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_enforce_article_ownership ON articles;
CREATE TRIGGER trigger_enforce_article_ownership
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_article_ownership();


-- ============================================
-- 5. EVERY VIEW THAT READS ARTICLES
-- ============================================
-- The filter goes in once per view rather than once per page. `article_list`
-- alone covers Home, Latest, Category, Tag, Author, Search and the admin
-- article list, because they all read it -- and `article_detail` and
-- `search_articles` inherit it by selecting from it.
--
-- Dependency order on a re-run is the same trap as in cms-schema.sql:
-- `search_articles` returns SETOF article_list and `article_detail` selects
-- from it, so both are dropped before the view and recreated after.
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
LEFT JOIN categories c ON c.id = a.category_id
WHERE a.deleted_at IS NULL;

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

-- The four views that count or aggregate articles without going through
-- `article_list`. A trashed article must not keep inflating a category badge,
-- a tag badge, an author's article count or a vote tally.
DROP VIEW IF EXISTS category_counts;
CREATE VIEW category_counts
WITH (security_invoker = on) AS
SELECT c.id, c.slug, c.name, c.description, c.color, c.sort_order,
       COUNT(a.id) AS article_count
FROM categories c
LEFT JOIN articles a
  ON a.category_id = c.id
 AND a.status = 'published'
 AND (a.published_at IS NULL OR a.published_at <= NOW())
 AND a.deleted_at IS NULL
GROUP BY c.id, c.slug, c.name, c.description, c.color, c.sort_order;

GRANT SELECT ON category_counts TO anon, authenticated;

DROP VIEW IF EXISTS tag_counts;
CREATE VIEW tag_counts
WITH (security_invoker = on) AS
SELECT t.id, t.slug, t.name, COUNT(a.id) AS article_count
FROM tags t
LEFT JOIN article_tags at ON at.tag_id = t.id
LEFT JOIN articles a
  ON a.id = at.article_id
 AND a.status = 'published'
 AND (a.published_at IS NULL OR a.published_at <= NOW())
 AND a.deleted_at IS NULL
GROUP BY t.id, t.slug, t.name;

GRANT SELECT ON tag_counts TO anon, authenticated;

CREATE OR REPLACE VIEW article_vote_counts
WITH (security_invoker = on) AS
SELECT
  a.id   AS article_id,
  a.slug AS article_slug,
  COUNT(*) FILTER (WHERE v.vote_type = 'read')               AS read_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'tutorial_verified')  AS tutorial_verified_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'links_verified')     AS links_verified_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'endorsed')           AS endorsed_count
FROM articles a
LEFT JOIN article_votes v ON a.id = v.article_id
WHERE a.status = 'published' AND a.deleted_at IS NULL
GROUP BY a.id, a.slug;

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
      AND a.deleted_at IS NULL
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


COMMIT;


-- ============================================
-- EMPTYING THE TRASH ON A SCHEDULE
-- ============================================
-- Left off on purpose -- the trash is only useful if it is still there when
-- someone goes looking. If you later decide it should empty itself, this is
-- the shape, with pg_cron enabled from the Supabase dashboard:
--
--   SELECT cron.schedule(
--     'purge-article-trash', '0 4 * * *',
--     $$DELETE FROM articles WHERE deleted_at < NOW() - INTERVAL '30 days'$$
--   );
--
-- It runs as the cron owner, bypassing RLS, so it deletes published articles
-- too. Say so in the UI before switching it on.
