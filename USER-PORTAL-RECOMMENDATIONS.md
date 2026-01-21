# User Portal Integration Recommendations

This document outlines the architecture and options for integrating a user portal with the static STEAM Reader site.

---

## Requirements Summary

- Simple user portal with basic account info and password reset
- Technology: Supabase + Resend
- User Roles: Admin, Manager, User (default: User)
- Age restriction: 13+
- Logged-in users can mark articles as:
  - **Mark as Read** — User has read the article (`_extra/read_icon.png` - checkmark in circle)
  - **Tutorial Verified** — User completed the tutorial hands-on successfully (`_extra/tutorial_verified_icon.png` - gear/cog icon)
  - **Links Verified** — User confirmed links and videos are working and current (`_extra/links_verified_icon.png` - chain link icon)
  - **Endorsed** — User's seal of approval, personally supports the content (`_extra/endorsed_icon.png` - thumbs up icon)

- **Auto-read rule:** If a user selects Tutorial Verified, Links Verified, or Endorsed, then "Mark as Read" is automatically checked (you can't verify or endorse without reading).

Vote counts display as tags/badges on articles.

### Badge Display Format

Badges appear on article cards/pages showing the count of users who have voted:

| Vote Type         | Icon                                                                   | Description         |
| ----------------- | ---------------------------------------------------------------------- | ------------------- |
| Mark as Read      | <img src="./_extra/read_icon.png" style="width: 20px;" />              | Checkmark in circle |
| Tutorial Verified | <img src="./_extra/tutorial_verified_icon.png" style="width: 20px;" /> | Gear/cog icon       |
| Links Verified    | <img src="./_extra/links_verified_icon.png" style="width: 20px;" />    | Chain link icon     |
| Endorsed          | <img src="./_extra/endorsed_icon.png" style="width: 20px;" />          | Thumbs up icon      |

**Example badge row:** `✓ 12  |  ⚙ 5  |  🔗 8  |  👍 15`

---

## Current Architecture

```
Markdown Files (md-articles/content/*.md)
    ↓
Build Script (article-processor.ts)
    ↓
JSON Files (public-site/src/data/articles/)
    ↓
React App (Cloudflare Pages)
```

**Key Finding:** Articles use **slugs** as their primary identifier (e.g., `python-fast-api`). These are derived from filenames and are stable/unique.

**Existing Validation Fields:** The schema already includes placeholder fields that are currently static:

- `validated_tutorial` (boolean)
- `supported_evidence` (boolean)
- `community_approved` (number)

---

## The Core Challenge

Linking **static JSON articles** (built at deploy time) to **dynamic user votes** (stored in Supabase at runtime).

---

## Option A: Use Slug as Database Key (Simplest)

Use the existing article slug as the primary key in Supabase.

```sql
-- Supabase Table
CREATE TABLE article_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('read', 'tutorial_verified', 'links_verified', 'endorsed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_slug, user_id, vote_type)
);
```

**Pros:**

- No changes to build system
- Slugs are already stable and unique
- Immediate implementation

**Cons:**

- If you rename an article slug, historical votes are orphaned
- Slug becomes a business-critical identifier

---

## Option B: Add UUID to Frontmatter (More Robust) ✔️ CHOSEN

Add an explicit `id` field to markdown frontmatter:

```yaml
---
id: "550e8400-e29b-41d4-a716-446655440000"
title: "Python FastAPI Server"
slug: python-fast-api
...
---
```

**Pros:**

- Slugs can change without breaking vote history
- Database uses stable UUIDs
- More traditional database design

**Cons:**

- ~~Requires manual UUID generation for each article~~ → Solved with template script
- Build system changes needed
- ~~Extra maintenance overhead~~ → Solved with sync script

---

## Option C: Deterministic ID from Slug (Zero Friction)

Generate a consistent ID at build time using a hash function:

```typescript
import crypto from "crypto";

const generateArticleId = (slug: string): string => {
  return crypto.createHash("sha256").update(slug).digest("hex").slice(0, 12);
};

// "python-fast-api" → "a1b2c3d4e5f6" (same every build)
```

**Pros:**

- No manual UUIDs needed
- Deterministic (same slug = same ID always)
- Minimal build system changes

**Cons:**

- Still tied to slug (renaming breaks ID)
- Hash collisions theoretically possible (extremely unlikely with 12 chars)

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare Pages (Static)                          │
│  ├── React App (existing site)                      │
│  ├── Supabase JS Client (browser-side)              │
│  └── Auth UI Components                             │
└─────────────────────────────────────────────────────┘
                        │
                        ▼ (client-side API calls)
┌─────────────────────────────────────────────────────┐
│  Supabase                                           │
│  ├── Auth                                           │
│  │   ├── Email/password signup & login              │
│  │   ├── Password reset (via Resend)                │
│  │   └── Session management                         │
│  ├── Database                                       │
│  │   ├── profiles (user info, roles, birthdate)    │
│  │   ├── article_votes (user votes on articles)    │
│  │   └── vote_aggregates (cached counts, optional) │
│  └── Edge Functions (optional)                      │
│      └── Send emails via Resend                     │
└─────────────────────────────────────────────────────┘
```

All authentication and voting happens **client-side** via the Supabase JS SDK. No backend server needed — Cloudflare Pages remains fully static.

---

## Proposed Database Schema

### `profiles` Table

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  birthdate DATE,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### `articles` Table (Synced from Static Site)

```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY,                    -- From frontmatter
  slug TEXT UNIQUE NOT NULL,              -- For lookups
  title TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()     -- Last sync timestamp
);

-- Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "Public read access" ON articles
  FOR SELECT USING (status = 'published');

-- Only service role can insert/update (sync script)
-- No user-facing write policies needed
```

### `article_votes` Table

```sql
CREATE TABLE article_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) NOT NULL,  -- FK to articles table
  user_id UUID REFERENCES auth.users NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('read', 'tutorial_verified', 'links_verified', 'endorsed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id, user_id, vote_type)
);

-- Indexes for performance
CREATE INDEX idx_article_votes_article ON article_votes(article_id);
CREATE INDEX idx_article_votes_user ON article_votes(user_id);

-- Row Level Security
ALTER TABLE article_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts (aggregated)
CREATE POLICY "Public read access" ON article_votes
  FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote" ON article_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can remove votes" ON article_votes
  FOR DELETE USING (auth.uid() = user_id);
```

### Vote Aggregation View

```sql
CREATE VIEW article_vote_counts AS
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
```

---

## Workflow Scripts

### 1. Article Template Generator

A CLI script to scaffold new articles with auto-generated UUIDs.

**Location:** `md-articles/scripts/new-article.ts`

**Usage:**

```bash
pnpm new "My Article Title"
# or with options
pnpm new "My Article Title" --author "Ryan Jones" --category "Technology"
```

**What it does:**

1. Generates a UUID v4
2. Creates filename with today's date: `YYYY-MM-DD-my-article-title.md`
3. Generates slug from title: `my-article-title`
4. Creates markdown file with frontmatter template

**Output Example:**

```markdown
---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
title: "My Article Title"
author: "Ryan Jones"
date: "2026-01-19"
category: "Technology"
tags: []
feature_image: "/images/articles/placeholder.jpg"
feature_image_alt: ""
excerpt: ""
status: "draft"
---

# My Article Title

Start writing here...
```

---

### 2. Database Sync Script

A CLI script to sync published articles to Supabase.

**Location:** `md-articles/scripts/sync-articles.ts`

**Usage:**

```bash
# Sync all published articles
pnpm sync

# Sync specific article by slug
pnpm sync --slug python-fast-api

# Dry run (preview changes)
pnpm sync --dry-run
```

**What it does:**

1. Reads all markdown files in `content/`
2. Parses frontmatter to extract `id`, `slug`, `title`, `status`, `date`
3. Connects to Supabase using service role key (from `.env`)
4. Upserts articles into the `articles` table
5. Reports what was added/updated/skipped

**Sync Logic:**

```
For each markdown file:
  ├── If status = "draft" → Skip (or mark as draft in DB)
  ├── If status = "published":
  │   ├── If article exists in DB → Update (title, slug, synced_at)
  │   └── If article is new → Insert
  └── If article in DB but not in files → Mark as archived (optional)
```

**Environment Variables Required:**

```bash
# md-articles/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role for write access
```

**When to Run:**

- Manually after publishing new articles
- As part of CI/CD pipeline (GitHub Actions) on merge to main
- Before deploying to Cloudflare Pages

---

### CI/CD Integration (Optional)

Add to GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  sync-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: cd md-articles && pnpm install

      - name: Sync articles to Supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: cd md-articles && pnpm sync

      - name: Build site
        run: cd public-site && pnpm install && pnpm build

      # Cloudflare Pages deployment happens automatically via integration
```

---

## Age Verification (13+)

Handle during signup:

```typescript
const validateAge = (birthdate: Date): boolean => {
  const today = new Date();
  const age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthdate.getDate())
  ) {
    return age - 1 >= 13;
  }
  return age >= 13;
};
```

Store birthdate in `profiles` table. Validate client-side before signup and enforce via database trigger if needed.

---

## Integration Points in React App

### New Routes Needed

| Route             | Purpose                            |
| ----------------- | ---------------------------------- |
| `/login`          | Sign in form                       |
| `/signup`         | Registration form (with age check) |
| `/reset-password` | Password reset request             |
| `/account`        | User profile management            |

### Article Page Changes

On each article page:

1. Fetch current user's votes for this article
2. Fetch aggregate vote counts
3. Display vote badges/tags
4. Show vote buttons if logged in

```typescript
// Example: Fetch votes for an article (by slug, joins to get UUID)
const { data: votes } = await supabase
  .from("article_vote_counts")
  .select("*")
  .eq("article_slug", slug)
  .single();

// Example: Check user's votes (article.id comes from the loaded JSON)
const { data: userVotes } = await supabase
  .from("article_votes")
  .select("vote_type")
  .eq("article_id", article.id) // UUID from article JSON
  .eq("user_id", user.id);

// Example: Cast a vote
const { error } = await supabase.from("article_votes").insert({
  article_id: article.id,
  user_id: user.id,
  vote_type: "tutorial_verified",
});
```

---

## Open Questions

1. ~~**Slug stability** — Will article slugs ever change?~~ → Resolved: Using UUIDs, slugs can change freely

2. **Vote aggregation strategy:**
   - **Live queries** — Always current, slight latency
   - **Cached/synced** — Faster reads, periodic updates

3. **Privacy** — Should votes be anonymous or show voter names?

4. **Admin features** — Should admins be able to:
   - Override/moderate votes?
   - See voting analytics?
   - Manage user roles?

5. **Email provider** — Supabase has built-in email. Is Resend required for branding/deliverability?

---

## Next Steps

### Phase 1: Foundation

- [ ] Create `new-article.ts` template generator script
- [ ] Add UUIDs to existing articles (4 articles)
- [ ] Update `article-processor.ts` to include `id` in JSON output
- [ ] Set up Supabase project

### Phase 2: Database

- [ ] Create `articles` table in Supabase
- [ ] Create `profiles` table with RLS policies
- [ ] Create `article_votes` table with RLS policies
- [ ] Create `article_vote_counts` view
- [ ] Create `sync-articles.ts` script
- [ ] Run initial sync of existing articles

### Phase 3: Frontend Auth

- [ ] Install `@supabase/supabase-js` in public-site
- [ ] Create Supabase client configuration
- [ ] Build login page
- [ ] Build signup page (with age verification)
- [ ] Build password reset flow
- [ ] Build account/profile page
- [ ] Add auth state to app (context/provider)

### Phase 4: Voting System

- [ ] Add voting UI components to article pages
- [ ] Fetch and display vote counts
- [ ] Implement vote/unvote functionality
- [ ] Display user's own votes when logged in

### Phase 5: Polish

- [ ] Configure Resend for transactional emails (optional)
- [ ] Add CI/CD sync step to deployment workflow
- [ ] Test end-to-end flow
