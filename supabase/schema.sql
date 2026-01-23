-- STEAM Reader Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Profile is created ONLY after email confirmation
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  birthdate DATE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- CREATE PROFILE ON EMAIL CONFIRMATION
-- ============================================
-- This trigger fires when a user confirms their email
-- It creates their profile using data from user_metadata
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile when email_confirmed_at changes from NULL to a value
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, display_name, birthdate)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'display_name',
      (NEW.raw_user_meta_data->>'birthdate')::DATE
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users UPDATE (when email is confirmed)
CREATE OR REPLACE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();

-- ============================================
-- ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "Public read access" ON articles
  FOR SELECT USING (status = 'published');

-- ============================================
-- ARTICLE VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('read', 'tutorial_verified', 'links_verified', 'endorsed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id, user_id, vote_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_votes_article ON article_votes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_votes_user ON article_votes(user_id);

-- Row Level Security for article_votes
ALTER TABLE article_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts
CREATE POLICY "Public read access" ON article_votes
  FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote" ON article_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can remove votes" ON article_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUTO-READ VOTE TRIGGER
-- ============================================
-- When a user votes tutorial_verified, links_verified, or endorsed,
-- automatically insert a 'read' vote if one doesn't exist
CREATE OR REPLACE FUNCTION auto_insert_read_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote_type != 'read' THEN
    INSERT INTO article_votes (article_id, user_id, vote_type)
    VALUES (NEW.article_id, NEW.user_id, 'read')
    ON CONFLICT (article_id, user_id, vote_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_auto_read_vote
  AFTER INSERT ON article_votes
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_read_vote();

-- ============================================
-- VOTE AGGREGATION VIEW
-- ============================================
CREATE OR REPLACE VIEW article_vote_counts AS
SELECT
  a.id AS article_id,
  a.slug AS article_slug,
  COUNT(*) FILTER (WHERE v.vote_type = 'read') AS read_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'tutorial_verified') AS tutorial_verified_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'links_verified') AS links_verified_count,
  COUNT(*) FILTER (WHERE v.vote_type = 'endorsed') AS endorsed_count
FROM articles a
LEFT JOIN article_votes v ON a.id = v.article_id
WHERE a.status = 'published'
GROUP BY a.id, a.slug;
