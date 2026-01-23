-- STEAM Reader Database Reset Script
-- WARNING: This will delete ALL data. Only use in development!
-- Run this in Supabase SQL Editor

-- ============================================
-- DROP VIEWS
-- ============================================
DROP VIEW IF EXISTS article_vote_counts;

-- ============================================
-- DROP TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS trigger_auto_read_vote ON article_votes;

-- ============================================
-- DROP FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_confirmed();
DROP FUNCTION IF EXISTS public.auto_insert_read_vote();

-- ============================================
-- DROP TABLES (order matters due to foreign keys)
-- ============================================
DROP TABLE IF EXISTS article_votes;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS profiles;

-- ============================================
-- DELETE ALL AUTH USERS
-- ============================================
-- This deletes all users from Supabase Auth
DELETE FROM auth.users;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify everything is clean:
-- SELECT * FROM profiles;
-- SELECT * FROM articles;
-- SELECT * FROM article_votes;
-- SELECT * FROM auth.users;
