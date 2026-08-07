-- ============================================================================
-- Fix 06 — retire the `article-images` Storage bucket
-- ============================================================================
-- Images moved to Cloudflare R2, served from cdn.steamreader.com. Uploads now
-- go through the Pages Function in functions/api/upload.ts, which checks the
-- caller's role itself -- see R2-SETUP.md.
--
-- That leaves the storage policies from cms-schema.sql guarding a bucket
-- nothing writes to any more. This drops them.
--
-- DO NOT RUN THIS UNTIL:
--   1. Both migration scripts have completed without failures.
--   2. The site has been redeployed and spot-checked -- an article image, a
--      course card, and an author avatar all loading from cdn.steamreader.com.
--
-- Until then the old objects are the rollback path: reverting the application
-- code is enough to bring them back, because nothing here has been deleted.
--
-- Safe to re-run.
-- ============================================================================


-- ============================================
-- 1. DROP THE POLICIES
-- ============================================
-- Names as created across cms-schema.sql and fix-04.
DROP POLICY IF EXISTS "Public read article images"         ON storage.objects;
DROP POLICY IF EXISTS "Contributors list article images"   ON storage.objects;
DROP POLICY IF EXISTS "Contributors upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Staff manage article images"        ON storage.objects;


-- ============================================
-- 2. THE OBJECTS AND THE BUCKET
-- ============================================
-- Left in place on purpose. With no policies the bucket is unreachable through
-- the API by anon and authenticated alike, which is the state we want, and the
-- objects cost almost nothing to keep.
--
-- Storage bills for what is stored, so once you are certain -- and have
-- confirmed the R2 copies are serving -- you can reclaim it. This is
-- irreversible; there is no undo and no backup of these objects.
--
-- Uncomment deliberately, one statement at a time:
--
--   DELETE FROM storage.objects WHERE bucket_id = 'article-images';
--   DELETE FROM storage.buckets WHERE id = 'article-images';
