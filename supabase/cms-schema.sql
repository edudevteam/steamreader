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
-- SECURITY DEFINER so a policy on `profiles` can ask "what role is the caller?"
-- without recursively triggering that same policy.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

-- "Staff" = editor or admin: full visibility over all content.
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() IN ('admin', 'editor');
$$;

-- Anyone who may author content at all.
CREATE OR REPLACE FUNCTION public.is_contributor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_role() IN ('admin', 'editor', 'writer');
$$;


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
  FOR SELECT TO authenticated USING (public.is_editor());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated USING (public.is_admin());

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
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());


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
  FOR INSERT TO authenticated WITH CHECK (public.is_contributor());

CREATE POLICY "Staff manage tags" ON tags
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());


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

-- Tag rows follow the permissions of the article they hang off.
CREATE POLICY "Authors manage own article tags" ON article_tags
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM articles a
    WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM articles a
    WHERE a.id = article_tags.article_id AND a.author_id = (select auth.uid())
  ));

CREATE POLICY "Staff manage article tags" ON article_tags
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());


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

-- Scheduled posts stay hidden until their publish date arrives.
CREATE POLICY "Public read published" ON articles
  FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= NOW()));

CREATE POLICY "Authors read own articles" ON articles
  FOR SELECT TO authenticated USING (author_id = (select auth.uid()));

CREATE POLICY "Staff read all articles" ON articles
  FOR SELECT TO authenticated USING (public.is_editor());

-- A writer may only create articles under their own byline; staff may assign.
CREATE POLICY "Contributors create articles" ON articles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_editor() OR (public.is_contributor() AND author_id = (select auth.uid())));

CREATE POLICY "Authors update own articles" ON articles
  FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Staff update any article" ON articles
  FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

-- Writers can retract their own unpublished work but cannot unpublish live posts.
CREATE POLICY "Authors delete own drafts" ON articles
  FOR DELETE TO authenticated
  USING (author_id = (select auth.uid()) AND status IN ('draft', 'in_review'));

CREATE POLICY "Staff delete any article" ON articles
  FOR DELETE TO authenticated USING (public.is_editor());


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
     AND NOT public.is_editor() THEN
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
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

CREATE POLICY "Public read course articles" ON course_articles
  FOR SELECT USING (true);

CREATE POLICY "Staff manage course articles" ON course_articles
  FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());


-- ============================================
-- PUBLIC AUTHOR VIEW
-- ============================================
-- Deliberately a definer view: it is the ONLY way anon reaches author data, and
-- it hard-codes the safe column list, so email and birthdate cannot leak.
DROP VIEW IF EXISTS public_authors;
CREATE VIEW public_authors AS
SELECT
  p.id,
  p.slug,
  p.display_name AS name,
  p.bio,
  p.avatar_url,
  p.social,
  COUNT(a.id) FILTER (
    WHERE a.status = 'published' AND (a.published_at IS NULL OR a.published_at <= NOW())
  ) AS article_count
FROM profiles p
LEFT JOIN articles a ON a.author_id = p.id
WHERE p.is_active AND p.role IN ('admin', 'editor', 'writer')
GROUP BY p.id, p.slug, p.display_name, p.bio, p.avatar_url, p.social;

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
DROP POLICY IF EXISTS "Contributors upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Staff manage article images"        ON storage.objects;

CREATE POLICY "Public read article images" ON storage.objects
  FOR SELECT USING (bucket_id = 'article-images');

CREATE POLICY "Contributors upload article images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images' AND public.is_contributor());

CREATE POLICY "Staff manage article images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'article-images' AND public.is_editor());
