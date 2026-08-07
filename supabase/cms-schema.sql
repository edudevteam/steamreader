-- ============================================================================
-- STEAM Reader CMS Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor AFTER schema.sql.
--
-- This migration turns the site into a database-backed CMS:
--   * profiles gain CMS roles (admin / editor / writer) plus author fields
--   * the stub `articles` table is widened into the real content table
--     (existing rows and their article_votes foreign keys are preserved)
--   * categories, tags, courses become first-class tables
--   * RLS enforces: writers touch only their own work, editors touch all
--     content, admins additionally manage users
--
-- It is idempotent -- safe to re-run.
-- ============================================================================


-- ============================================
-- ROLES
-- ============================================
-- Roles are hierarchical for content purposes:
--   user   -- public reader. Votes on articles. No CMS access.
--   writer -- authors articles. Sees and edits ONLY their own.
--   editor -- sees and edits ALL articles, publishes, manages taxonomy.
--   admin  -- everything an editor can do, plus user management.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Existing installs used 'manager'; fold those into the new 'editor' role.
UPDATE profiles SET role = 'editor' WHERE role = 'manager';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'editor', 'writer', 'user'));


-- ============================================
-- PROFILES AS AUTHORS
-- ============================================
-- A CMS user *is* an author, so the public author page and the "my articles"
-- list read from the same identity. No separate authors table to keep in sync.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social     JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key ON profiles(slug) WHERE slug IS NOT NULL;

-- Derive a slug for any profile that lacks one, so authors always resolve.
UPDATE profiles
SET slug = regexp_replace(lower(trim(COALESCE(display_name, split_part(email, '@', 1), 'author'))), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;


-- ============================================
-- ROLE HELPERS
-- ============================================
-- They live in `private`, not `public`, because PostgREST publishes only its
-- configured schemas -- so nothing here is reachable at /rest/v1/rpc/* no
-- matter what it is granted. That matters because these cannot simply be
-- locked down: an RLS policy is evaluated with the querying user's privileges,
-- so `authenticated` must hold EXECUTE for the CMS to read its own tables.
-- Out of the API schema is the only way to have both.
--
-- Policies elsewhere in this file call them as `private.is_editor()` and so on.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- SECURITY DEFINER so a policy on `profiles` can ask "what role is the caller?"
-- without recursively triggering that same policy. `search_path = ''` means
-- every reference in a body must stay schema-qualified.
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() = 'admin';
$$;

-- "Staff" = editor or admin: full visibility over all content.
CREATE OR REPLACE FUNCTION private.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() IN ('admin', 'editor');
$$;

-- Anyone who may author content at all.
CREATE OR REPLACE FUNCTION private.is_contributor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_role() IN ('admin', 'editor', 'writer');
$$;

-- The byline helpers (is_article_primary_author, is_article_co_author,
-- can_edit_as_co_author) live with `article_authors` further down -- a SQL
-- function body is validated at CREATE time, so they cannot be declared
-- before the table they read.

-- Belt and braces alongside the schema: every policy calling these is
-- `TO authenticated`, so a logged-out request never evaluates them, and
-- Postgres hands EXECUTE to PUBLIC on every new function. Take that back and
-- grant it only to roles that can actually be someone.
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin()          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_editor()         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_contributor()    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin()          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_editor()         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_contributor()    TO authenticated, service_role;


-- ============================================
-- PROFILES RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view all profiles"  ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);

-- Editors and admins need the roster to attribute and reassign articles.
CREATE POLICY "Staff can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (private.is_editor());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated USING (private.is_admin());

-- Every reader must be able to resolve a byline: `article_list` runs with
-- security_invoker = on and joins profiles, so without access every listing
-- page fails with "permission denied for table profiles" (logged out) or
-- silently shows no author (logged in, seeing only their own row).
--
-- So grant the byline columns to everyone, and grant nothing else. `email` and
-- `birthdate` are revoked from both roles, which means `select=*` returns a
-- permission error instead of leaking them. The column grant is the boundary,
-- not obscurity. Staff read addresses through the admin-users function, which
-- holds service_role and checks the caller's role first.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, slug, display_name, bio, avatar_url, social, role, is_active, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view contributor profiles" ON profiles;

-- Column grants decide which columns; this decides which rows. Bylines resolve
-- for active contributors only -- a reader account is never exposed.
CREATE POLICY "Public can view contributor profiles" ON profiles
  FOR SELECT TO anon, authenticated
  USING (is_active AND role IN ('admin', 'editor', 'writer'));


-- (The public_authors view is defined after `articles` gains its author_id.)


-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories"   ON categories;
DROP POLICY IF EXISTS "Contributors read categories" ON categories;
DROP POLICY IF EXISTS "Staff manage categories"  ON categories;

CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Staff manage categories" ON categories
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());


-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tags"        ON tags;
DROP POLICY IF EXISTS "Contributors write tags" ON tags;
DROP POLICY IF EXISTS "Staff manage tags"       ON tags;

CREATE POLICY "Public read tags" ON tags
  FOR SELECT USING (true);

-- Writers may mint a new tag while drafting; only staff may rename or delete.
CREATE POLICY "Contributors write tags" ON tags
  FOR INSERT TO authenticated WITH CHECK (private.is_contributor());

CREATE POLICY "Staff manage tags" ON tags
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());


-- ============================================
-- ARTICLES
-- ============================================
-- Widen the existing stub table in place: article_votes.article_id already
-- references articles(id), and dropping the table would take the votes with it.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS subtitle         TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt          TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_markdown TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_html     TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS toc              JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS feature_image    JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_time     INTEGER NOT NULL DEFAULT 1;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS validation       JSONB;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id        UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_id      UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS previous_slug    TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS next_slug        TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Co-authors are a byline credit by default; the primary author opts an
-- article into shared editing. See the ARTICLE AUTHORS section below.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS co_authors_can_edit BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE articles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 'in_review' lets a writer hand work to an editor without publish rights.
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft', 'in_review', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_articles_author    ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category  ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status    ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

-- Full-text search over the fields the public Search page actually queries.
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(subtitle, '') || ' ' || excerpt));


-- ============================================
-- ARTICLE AUTHORS (CO-AUTHORS)
-- ============================================
-- `articles.author_id` stays the PRIMARY author -- the only non-staff account
-- that may reassign, delete, or change sharing on an article. This table holds
-- the additional credits, in byline order.
CREATE TABLE IF NOT EXISTS article_authors (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_article_authors_author ON article_authors(author_id);

GRANT SELECT ON article_authors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON article_authors TO authenticated;

-- SECURITY DEFINER for the same reason as the role helpers: a policy on
-- `articles` that reads `article_authors` would otherwise re-enter that
-- table's own RLS on every row.
CREATE OR REPLACE FUNCTION private.is_article_primary_author(target UUID)
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
CREATE OR REPLACE FUNCTION private.is_article_co_author(target UUID)
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
CREATE OR REPLACE FUNCTION private.can_edit_as_co_author(target UUID)
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

-- Same reasoning as the role helpers: signed-in callers only, never PUBLIC.
REVOKE ALL ON FUNCTION private.is_article_primary_author(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_article_co_author(UUID)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit_as_co_author(UUID)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_article_primary_author(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_article_co_author(UUID)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_edit_as_co_author(UUID)     TO authenticated, service_role;

-- Same reasoning as the role helpers: take back the implicit PUBLIC grant so
-- these do not surface at /rest/v1/rpc/*.
REVOKE ALL ON FUNCTION private.is_article_primary_author(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_article_co_author(UUID)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit_as_co_author(UUID)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_article_primary_author(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_article_co_author(UUID)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_edit_as_co_author(UUID)     TO authenticated, service_role;

ALTER TABLE article_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read article authors"       ON article_authors;
DROP POLICY IF EXISTS "Primary author manages co-authors" ON article_authors;
DROP POLICY IF EXISTS "Staff manage co-authors"           ON article_authors;

-- Bylines are public, so the join rows must be readable by anon -- the same
-- reasoning as `article_tags`. Names still come from `profiles`, which exposes
-- contributor rows and never email.
CREATE POLICY "Public read article authors" ON article_authors
  FOR SELECT USING (true);

-- Deliberately the PRIMARY author only: a co-author with edit rights must not
-- be able to recruit further co-authors.
CREATE POLICY "Primary author manages co-authors" ON article_authors
  FOR ALL TO authenticated
  USING (private.is_article_primary_author(article_id))
  WITH CHECK (private.is_article_primary_author(article_id));

CREATE POLICY "Staff manage co-authors" ON article_authors
  FOR ALL TO authenticated
  USING (private.is_editor()) WITH CHECK (private.is_editor());


-- ============================================
-- ARTICLE <-> TAG JOIN
-- ============================================
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag_id);

ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read article tags"  ON article_tags;
DROP POLICY IF EXISTS "Authors manage own article tags" ON article_tags;
DROP POLICY IF EXISTS "Staff manage article tags" ON article_tags;

CREATE POLICY "Public read article tags" ON article_tags
  FOR SELECT USING (true);

-- Tag rows follow the permissions of the article they hang off, so a co-author
-- who may edit the body may also retag it.
CREATE POLICY "Authors manage own article tags" ON article_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
    )
    OR private.can_edit_as_co_author(article_tags.article_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
    )
    OR private.can_edit_as_co_author(article_tags.article_id)
  );

CREATE POLICY "Staff manage article tags" ON article_tags
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());


-- ============================================
-- ARTICLES RLS
-- ============================================
DROP POLICY IF EXISTS "Public read access"          ON articles;
DROP POLICY IF EXISTS "Public read published"       ON articles;
DROP POLICY IF EXISTS "Authors read own articles"   ON articles;
DROP POLICY IF EXISTS "Staff read all articles"     ON articles;
DROP POLICY IF EXISTS "Contributors create articles" ON articles;
DROP POLICY IF EXISTS "Authors update own articles" ON articles;
DROP POLICY IF EXISTS "Staff update any article"    ON articles;
DROP POLICY IF EXISTS "Authors delete own drafts"   ON articles;
DROP POLICY IF EXISTS "Staff delete any article"    ON articles;
DROP POLICY IF EXISTS "Co-authors read editable articles"   ON articles;
DROP POLICY IF EXISTS "Co-authors update editable articles" ON articles;

-- Scheduled posts stay hidden until their publish date arrives.
CREATE POLICY "Public read published" ON articles
  FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= NOW()));

CREATE POLICY "Authors read own articles" ON articles
  FOR SELECT TO authenticated USING (author_id = (select auth.uid()));

CREATE POLICY "Staff read all articles" ON articles
  FOR SELECT TO authenticated USING (private.is_editor());

-- A writer may only create articles under their own byline; staff may assign.
CREATE POLICY "Contributors create articles" ON articles
  FOR INSERT TO authenticated
  WITH CHECK (private.is_editor() OR (private.is_contributor() AND author_id = (select auth.uid())));

CREATE POLICY "Authors update own articles" ON articles
  FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Staff update any article" ON articles
  FOR UPDATE TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());

-- Writers can retract their own unpublished work but cannot unpublish live posts.
CREATE POLICY "Authors delete own drafts" ON articles
  FOR DELETE TO authenticated
  USING (author_id = (select auth.uid()) AND status IN ('draft', 'in_review'));

CREATE POLICY "Staff delete any article" ON articles
  FOR DELETE TO authenticated USING (private.is_editor());

-- Co-author access is gated on the article's own switch, not on mere credit: a
-- credit-only co-author has no business reading an unpublished draft. Once
-- published, the public policy covers them like any other reader. There is
-- deliberately no matching DELETE policy -- retracting an article stays with
-- the primary author and staff.
CREATE POLICY "Co-authors read editable articles" ON articles
  FOR SELECT TO authenticated USING (private.can_edit_as_co_author(id));

CREATE POLICY "Co-authors update editable articles" ON articles
  FOR UPDATE TO authenticated
  USING (private.can_edit_as_co_author(id))
  WITH CHECK (private.can_edit_as_co_author(id));


-- ============================================
-- WRITERS MAY NOT SELF-PUBLISH
-- ============================================
-- RLS cannot compare OLD and NEW, so the publish gate is a trigger.
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

DROP TRIGGER IF EXISTS trigger_enforce_publish ON articles;
CREATE TRIGGER trigger_enforce_publish
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_permission();


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
-- Both are UPDATEs the co-author policy would otherwise allow.
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
$$;

-- Trigger functions are not RPC endpoints. EXECUTE is checked when the trigger
-- is created, not when it fires, so revoking costs nothing and keeps them off
-- /rest/v1/rpc/*.
REVOKE ALL ON FUNCTION public.enforce_publish_permission()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_article_ownership()   FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_enforce_article_ownership ON articles;
CREATE TRIGGER trigger_enforce_article_ownership
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_article_ownership();


-- ============================================
-- TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_articles_updated_at ON articles;
CREATE TRIGGER trigger_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================
-- COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  feature_image JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_articles (
  course_id  UUID REFERENCES courses(id)  ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, article_id)
);

ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read courses"          ON courses;
DROP POLICY IF EXISTS "Staff manage courses"         ON courses;
DROP POLICY IF EXISTS "Public read course articles"  ON course_articles;
DROP POLICY IF EXISTS "Staff manage course articles" ON course_articles;

CREATE POLICY "Public read courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Staff manage courses" ON courses
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());

CREATE POLICY "Public read course articles" ON course_articles
  FOR SELECT USING (true);

CREATE POLICY "Staff manage course articles" ON course_articles
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());


-- ============================================
-- PUBLIC AUTHOR VIEW
-- ============================================
-- security_invoker = on, like every other view here: the caller's own grants and
-- policies decide what it returns. The byline column grant and the contributor
-- row policy above cover exactly what this selects, and email and birthdate stay
-- revoked, so a definer view would buy nothing and only trips the linter.
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
  -- Counts co-authored work too, so the number matches what the author page
  -- actually lists.
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


-- ============================================
-- ARTICLE LIST VIEW
-- ============================================
-- Every public listing page (Home, Latest, Category, Tag, Author, Search) wants
-- the same denormalized shape the old articles.json had: byline, category, and
-- tags inline. Doing it here keeps those pages to a single round trip.
--
-- security_invoker = on, so the caller's RLS on `articles` still decides which
-- rows come back: anon sees published only, a writer additionally sees their
-- own drafts, staff see everything.
-- Dependency order matters on a re-run: `article_detail` selects from this view
-- and `search_articles` returns SETOF it, so both have to go first or the DROP
-- fails with "other objects depend on it". They are recreated below.
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

-- Same shape plus the rendered body, for the single-article page.
DROP VIEW IF EXISTS article_detail;
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


-- ============================================
-- TAXONOMY COUNT VIEWS
-- ============================================
-- The Categories and Tags index pages show article counts. Counting in the
-- database avoids shipping every article row to the browser just to tally.
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
GROUP BY t.id, t.slug, t.name;

GRANT SELECT ON tag_counts TO anon, authenticated;


-- ============================================
-- VOTE COUNT VIEW (rebuilt)
-- ============================================
-- schema.sql defined this against the stub table; recreate it so it keeps
-- working now that `articles` carries scheduling.
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
WHERE a.status = 'published'
GROUP BY a.id, a.slug;


-- ============================================
-- SEARCH
-- ============================================
-- Ranked full-text search, exposed to the Search page as an RPC.
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
-- STORAGE: ARTICLE IMAGES
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read article images"        ON storage.objects;
DROP POLICY IF EXISTS "Contributors list article images"  ON storage.objects;
DROP POLICY IF EXISTS "Contributors upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Staff manage article images"        ON storage.objects;

-- No public SELECT policy on purpose. The bucket is public, so object URLs are
-- served from the CDN without consulting RLS -- a reader needs nothing here.
-- A broad SELECT policy would instead let anyone with the anon key *list* the
-- bucket, including images attached to unpublished drafts.
CREATE POLICY "Contributors list article images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'article-images' AND private.is_contributor());

CREATE POLICY "Contributors upload article images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images' AND private.is_contributor());

CREATE POLICY "Staff manage article images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'article-images' AND private.is_editor());
