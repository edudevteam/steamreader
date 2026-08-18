-- ============================================================================
-- Fix 08 — courses become groups, and groups get their own categories
-- ============================================================================
-- A "course" was the only way to bundle articles into an ordered set, and the
-- name decided what the bundle could be used for: a reading list, a series or
-- a collection all had to be called a course or not exist at all.
--
-- Shape of the change:
--
--   * `courses` becomes `groups`, `course_articles` becomes `group_articles`.
--     The tables are renamed, not recreated, so every existing group and its
--     running order survive untouched.
--   * `group_categories` is a new taxonomy over groups, mirroring `categories`
--     over articles -- same columns, same policies, same one-category-per-row
--     shape. It is a separate table rather than a reuse of `categories`
--     because an article category ("Biology") and a group category
--     ("Courses") answer different questions and would collide in both
--     admin pickers if they shared a list.
--   * A "Courses" group category is seeded and every existing group is put in
--     it, because that is what those rows were before this migration. The
--     public site reads that category to build its Courses section, so the
--     seed is what keeps the site looking identical after the rename.
--
-- `groups.category_id` is nullable with ON DELETE SET NULL, matching
-- `articles.category_id`: deleting a category must never take content with
-- it. An uncategorised group is reachable at its own URL but appears in no
-- public section, which is the same deal an uncategorised article gets.
--
-- NOT DONE HERE, on purpose:
--   * No many-to-many. A group belongs to one category, as an article does.
--   * The seeded category is ordinary data, not a protected row. Renaming or
--     deleting it is allowed -- the public site keys off the slug it finds,
--     not off this migration.
--
-- ORDER: run AFTER fix-05 -- the policies here call `private.is_editor()`,
-- which is where fix-05 leaves it.
--
-- Runs as one transaction. Safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Rename the tables
-- ----------------------------------------------------------------------------
-- Guarded rather than unconditional so a re-run is a no-op instead of an
-- error, and so this file can be applied to a database that already went
-- through it.
DO $$
BEGIN
  IF to_regclass('public.courses') IS NOT NULL
     AND to_regclass('public.groups') IS NULL THEN
    ALTER TABLE public.courses RENAME TO groups;
  END IF;

  IF to_regclass('public.course_articles') IS NOT NULL
     AND to_regclass('public.group_articles') IS NULL THEN
    ALTER TABLE public.course_articles RENAME TO group_articles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'group_articles'
      AND column_name = 'course_id'
  ) THEN
    ALTER TABLE public.group_articles RENAME COLUMN course_id TO group_id;
  END IF;
END;
$$;

-- Indexes and constraints keep the name they were created under, so a
-- `courses_pkey` would sit on `groups` forever. Cosmetic, but the next person
-- reading a constraint violation should not have to know the table was ever
-- called something else.
DO $$
BEGIN
  IF to_regclass('public.courses_pkey') IS NOT NULL THEN
    ALTER INDEX public.courses_pkey RENAME TO groups_pkey;
  END IF;
  IF to_regclass('public.courses_slug_key') IS NOT NULL THEN
    ALTER INDEX public.courses_slug_key RENAME TO groups_slug_key;
  END IF;
  IF to_regclass('public.course_articles_pkey') IS NOT NULL THEN
    ALTER INDEX public.course_articles_pkey RENAME TO group_articles_pkey;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Group categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS category_id UUID
  REFERENCES group_categories(id) ON DELETE SET NULL;

-- The public site filters groups by category on every page that lists them.
CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category_id);

ALTER TABLE group_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read group categories"  ON group_categories;
DROP POLICY IF EXISTS "Staff manage group categories" ON group_categories;

CREATE POLICY "Public read group categories" ON group_categories
  FOR SELECT USING (true);

CREATE POLICY "Staff manage group categories" ON group_categories
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());

-- ----------------------------------------------------------------------------
-- 3. Repoint the policies at the new names
-- ----------------------------------------------------------------------------
-- A rename carries the policies across under their old names, so these drops
-- clear both spellings before the new ones go on.
DROP POLICY IF EXISTS "Public read courses"          ON groups;
DROP POLICY IF EXISTS "Staff manage courses"         ON groups;
DROP POLICY IF EXISTS "Public read groups"           ON groups;
DROP POLICY IF EXISTS "Staff manage groups"          ON groups;
DROP POLICY IF EXISTS "Public read course articles"  ON group_articles;
DROP POLICY IF EXISTS "Staff manage course articles" ON group_articles;
DROP POLICY IF EXISTS "Public read group articles"   ON group_articles;
DROP POLICY IF EXISTS "Staff manage group articles"  ON group_articles;

ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Staff manage groups" ON groups
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());

CREATE POLICY "Public read group articles" ON group_articles
  FOR SELECT USING (true);

CREATE POLICY "Staff manage group articles" ON group_articles
  FOR ALL TO authenticated USING (private.is_editor()) WITH CHECK (private.is_editor());

-- ----------------------------------------------------------------------------
-- 4. Seed the Courses category and adopt the existing rows
-- ----------------------------------------------------------------------------
INSERT INTO group_categories (slug, name, description, sort_order)
VALUES (
  'courses',
  'Courses',
  'Ordered sets of articles read as a course. Shown on the home page.',
  0
)
ON CONFLICT (slug) DO NOTHING;

-- Only the rows that predate categories. A group deliberately left
-- uncategorised after this migration stays that way on a re-run.
UPDATE groups
   SET category_id = (SELECT id FROM group_categories WHERE slug = 'courses')
 WHERE category_id IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Counts for the admin taxonomy screen
-- ----------------------------------------------------------------------------
-- Counts every group in the category, published lessons or not: the admin
-- screen uses this to warn before deleting a category, and a category holding
-- only draft groups is still holding something.
DROP VIEW IF EXISTS group_category_counts;
CREATE VIEW group_category_counts
WITH (security_invoker = on) AS
SELECT gc.id, gc.slug, gc.name, gc.description, gc.color, gc.sort_order,
       COUNT(g.id) AS group_count
FROM group_categories gc
LEFT JOIN groups g ON g.category_id = gc.id
GROUP BY gc.id, gc.slug, gc.name, gc.description, gc.color, gc.sort_order;

GRANT SELECT ON group_category_counts TO anon, authenticated;

COMMIT;
