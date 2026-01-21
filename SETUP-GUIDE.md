# STEAM Reader Setup Guide

Complete instructions for cloning and setting up the STEAM Reader project with Supabase authentication, voting system, and Resend email integration.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Supabase Configuration](#supabase-configuration)
5. [Resend Email Integration](#resend-email-integration)
6. [Environment Variables](#environment-variables)
7. [Database Schema](#database-schema)
8. [Syncing Articles](#syncing-articles)
9. [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
10. [Production Configuration](#production-configuration)

---

## Project Overview

### Directory Structure

```
steamreader/
├── md-articles/                 # Article content and processing
│   ├── content/                 # Markdown article files
│   ├── scripts/                 # Build and sync scripts
│   │   ├── lib/                 # Processing libraries
│   │   └── sync-articles.ts     # Supabase sync script
│   ├── supabase/                # Supabase configuration
│   │   ├── functions/           # Edge Functions
│   │   │   ├── send-email/
│   │   │   └── send-welcome-email/
│   │   └── schema.sql           # Database schema
│   └── .env                     # Environment variables (not committed)
│
├── public-site/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── layout/Header/   # Navigation with auth
│   │   │   ├── VoteBadges/      # Vote count badges
│   │   │   └── VoteButtons/     # Interactive voting UI
│   │   ├── context/             # React contexts
│   │   │   └── AuthContext.tsx  # Authentication state
│   │   ├── hooks/               # Custom hooks
│   │   │   └── useArticleVotes.ts
│   │   ├── lib/
│   │   │   └── supabase.ts      # Supabase client
│   │   ├── pages/               # Route pages
│   │   │   ├── Account/
│   │   │   ├── Login/
│   │   │   ├── ResetPassword/
│   │   │   └── Signup/
│   │   └── types/
│   └── .env                     # Environment variables (not committed)
│
└── SETUP-GUIDE.md               # This file
```

### Key Features

- **Static Site Generation**: Articles are built from markdown files
- **User Authentication**: Supabase Auth with email/password
- **Voting System**: Users can mark articles as read, verified, or endorsed
- **Email Integration**: Resend for transactional emails

---

## Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase account (free tier works)
- Resend account (free tier works)
- Cloudflare account (for deployment)
- Domain name (for email verification)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd steamreader
```

### 2. Install Dependencies

```bash
# Install md-articles dependencies
cd md-articles
pnpm install

# Install public-site dependencies
cd ../public-site
pnpm install
```

### 3. Build Articles

```bash
cd md-articles
pnpm build
```

### 4. Run Development Server

```bash
cd public-site
pnpm dev
```

---

## Supabase Configuration

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and keys from Settings → API

### 2. Run the Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `md-articles/supabase/schema.sql`
3. Run the SQL

The schema creates:
- `profiles` table with user data
- `articles` table for synced articles
- `article_votes` table for user votes
- `article_vote_counts` view for aggregated counts
- Row Level Security policies
- Triggers for auto-creating profiles and auto-read votes

### 3. Enable Required Extensions

In Supabase Dashboard → Database → Extensions, enable:
- `pg_net` (for HTTP requests from triggers, optional)

### 4. Configure Authentication Settings

In Supabase Dashboard → Authentication → URL Configuration:

**For Local Development:**
- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/**`

**For Production:**
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

### 5. Email Templates (Optional)

In Authentication → Email Templates, customize:
- Confirm signup
- Reset Password
- Magic Link
- Change Email

---

## Resend Email Integration

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Create an account

### 2. Verify Your Domain

1. In Resend → Domains → Add Domain
2. Enter your domain (e.g., `steamreader.com`)
3. Add the DNS records Resend provides:
   - SPF record (TXT)
   - DKIM records (CNAME)
4. Wait for verification (usually under 1 hour)

### 3. Connect to Supabase (Native Integration)

1. In Resend → Settings → Integrations
2. Click "Connect to Supabase"
3. Authorize and select your project

This automatically configures Supabase to send auth emails through Resend.

### 4. Configure Sender

1. In Resend → Email Addresses
2. Add sender: `no-reply@yourdomain.com`
3. Set sender name: `Your App Name`

### 5. Deploy Edge Functions (Optional)

For custom emails beyond auth (welcome emails, notifications):

```bash
cd md-articles

# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project (get ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Set Resend API key
supabase secrets set RESEND_API_KEY=re_your_api_key

# Deploy functions
supabase functions deploy send-email
supabase functions deploy send-welcome-email
```

---

## Environment Variables

### md-articles/.env

```env
# Supabase (for sync script)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Use the **service role key** (not anon key) for the sync script. This key has full database access and bypasses RLS.

### public-site/.env

```env
# Supabase (for frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** The `VITE_` prefix is required for Vite to expose these to the frontend. Use the **anon key** here - it's safe to expose publicly.

### Security Notes

- **Never commit .env files** - they're in .gitignore
- **Service role key** is secret - only use server-side
- **Anon key** is public - safe for frontend
- Environment variables in Cloudflare Pages are encrypted

---

## Database Schema

The schema includes these key components:

### Tables

**profiles**
```sql
- id: UUID (references auth.users)
- email: text
- display_name: text
- birthdate: date
- role: enum ('admin', 'manager', 'user')
- created_at, updated_at: timestamps
```

**articles**
```sql
- id: UUID (from frontmatter)
- slug: text (unique)
- title: text
- status: enum ('draft', 'published', 'archived')
- published_at: timestamp
- synced_at: timestamp
```

**article_votes**
```sql
- id: UUID
- article_id: UUID
- user_id: UUID
- vote_type: enum ('read', 'tutorial_verified', 'links_verified', 'endorsed')
- created_at: timestamp
```

### Row Level Security

- Users can only manage their own votes
- Anyone can read articles and vote counts
- Profile access restricted to own profile

### Triggers

1. **Auto-create profile**: When a user signs up, automatically creates a profile
2. **Auto-read vote**: When voting tutorial_verified, links_verified, or endorsed, automatically adds a read vote

---

## Syncing Articles

Articles must have a UUID in their frontmatter to sync:

```yaml
---
id: "c9e4a2b1-5f8d-4e3a-9c7b-8d6e5f4a3b2c"
title: "Article Title"
# ... other frontmatter
---
```

### Generate UUIDs

Use any UUID generator, or run:
```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

### Sync Commands

```bash
cd md-articles

# Sync all articles
pnpm sync

# Dry run (preview without changes)
pnpm sync:dry

# Sync specific article
pnpm sync --slug article-slug
```

---

## Cloudflare Pages Deployment

### 1. Connect Repository

1. Go to Cloudflare Dashboard → Pages
2. Create a project → Connect to Git
3. Select your repository

### 2. Configure Build Settings

**For public-site:**
- Framework preset: Vite
- Build command: `cd public-site && pnpm install && pnpm build`
- Build output directory: `public-site/dist`
- Root directory: `/`

### 3. Set Environment Variables

In Cloudflare Pages → Settings → Environment Variables:

**Production:**
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

**Preview (optional, for staging):**
Same variables, potentially pointing to a staging Supabase project.

### 4. Custom Domain

1. In Pages → Custom Domains
2. Add your domain
3. Follow DNS configuration instructions

---

## Production Configuration

### 1. Update Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://yourdomain.com
Redirect URLs: https://yourdomain.com/**
```

### 2. Verify Email Delivery

1. Test signup flow on production
2. Check Resend dashboard for delivery status
3. If emails go to spam, ensure:
   - Domain is verified
   - SPF/DKIM records are correct
   - Sender address matches verified domain

### 3. Remove Debug Logging

Before final production release, remove console.logs from:
- `public-site/src/context/AuthContext.tsx`

### 4. Enable Email Confirmation (Optional)

In Supabase → Authentication → Providers → Email:
- Toggle "Confirm email" on/off based on your needs

---

## Troubleshooting

### Auth Issues

**"Loading..." stuck on Account page**
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Try force logout: `localStorage.clear()` in console

**Can't sign in on localhost**
- Ensure Supabase redirect URLs include `http://localhost:5173/**`
- Check if email confirmation is required

### Sync Issues

**RLS policy error when syncing**
- Use `SUPABASE_SERVICE_ROLE_KEY`, not anon key
- Verify the key in Supabase Dashboard → Settings → API

**Articles not appearing**
- Ensure articles have valid UUIDs
- Run `pnpm sync` after adding new articles

### Email Issues

**Emails not sending**
- Check Resend dashboard for delivery status
- Verify domain is confirmed
- Check spam folder

**Emails marked as spam**
- Ensure SPF/DKIM records are configured
- Use a proper sender name
- Avoid spam trigger words in templates

---

## Quick Reference

### Common Commands

```bash
# Build articles
cd md-articles && pnpm build

# Sync to Supabase
cd md-articles && pnpm sync

# Run frontend dev server
cd public-site && pnpm dev

# Build frontend for production
cd public-site && pnpm build

# Deploy Edge Functions
cd md-articles && supabase functions deploy
```

### Key Files

| File | Purpose |
|------|---------|
| `md-articles/supabase/schema.sql` | Database schema |
| `public-site/src/context/AuthContext.tsx` | Auth state management |
| `public-site/src/lib/supabase.ts` | Supabase client |
| `md-articles/scripts/sync-articles.ts` | Article sync script |

### Environment Variable Checklist

| Variable | Location | Key Type |
|----------|----------|----------|
| `SUPABASE_URL` | md-articles/.env | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | md-articles/.env | **Secret** |
| `VITE_SUPABASE_URL` | public-site/.env | Public |
| `VITE_SUPABASE_ANON_KEY` | public-site/.env | Public |
| `RESEND_API_KEY` | Supabase secrets | **Secret** |
