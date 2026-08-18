-- ============================================================================
-- Fix 09 — site settings, and the home page layout that lives in them
-- ============================================================================
-- The home page was a hard-coded arrangement: a search bar, category pills,
-- courses, a quote, tutorials, then everything else. Changing the order, or
-- adding a second group section, meant a code change and a deploy.
--
-- Shape of the change:
--
--   * `site_settings` is a one-row-per-key store of JSON documents. It is
--     deliberately generic -- key/value rather than a column per setting --
--     because the next setting should not need a migration. The trade is that
--     the shape of each value is validated in TypeScript, not in Postgres.
--   * `home_layout` is the first key. Its value is an ordered list of section
--     descriptors that the home page renders top to bottom. `category_layout`
--     and `tag_layout` came later and hold the same kind of document for the
--     category and tag archives -- no migration needed, which is the point of
--     a key/value store.
--
-- WHO MAY WRITE is admin only, not editor. Rearranging the front page is a
-- different kind of act from publishing an article: one editor's experiment
-- changes what every visitor sees first, with no draft state to catch it.
-- Reads are public and unauthenticated, because the home page is.
--
-- NOT DONE HERE, on purpose:
--   * No row is seeded. An absent key means "use the built-in default", which
--     is the layout the site shipped with -- so this migration changes nothing
--     visible until someone opens the Designer and saves.
--   * No history or draft/publish cycle. A save is live. The designer offers
--     "reset to default", which deletes the row rather than writing one.
--
-- ORDER: run AFTER fix-05 -- the write policy calls `private.is_admin()`,
-- which is where fix-05 leaves it.
--
-- Runs as one transaction. Safe to re-run.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE site_settings IS
  'Key/value JSON settings for the public site. Shape is validated in the client, not here.';

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings"   ON site_settings;
DROP POLICY IF EXISTS "Admins manage site settings" ON site_settings;

-- The home page reads this before anyone signs in.
CREATE POLICY "Public read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage site settings" ON site_settings
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- `updated_at` is what the designer shows as "last saved", so it has to move
-- on every write rather than only on insert.
CREATE OR REPLACE FUNCTION public.touch_site_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_touch ON site_settings;
CREATE TRIGGER site_settings_touch
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_settings();

COMMIT;

-- ============================================================================
-- Verify
-- ============================================================================
--   SELECT key, jsonb_array_length(value -> 'sections') AS sections, updated_at
--   FROM site_settings;
--
-- Expect: no rows until the first save in the designer, one `home_layout` row
-- after it.
