# STEAM Reader CMS — Setup

The public site is backed by a database-driven CMS at `/admin`. Content lives in
Supabase, which is the only source of truth — the markdown build pipeline that
preceded it has been removed.

Work through the steps in order.

---

## 1. Apply the database schema

In the Supabase SQL editor, run the two files in this order:

1. `supabase/schema.sql` — only if you have not already (profiles, votes)
2. `supabase/cms-schema.sql` — the CMS migration

`cms-schema.sql` is idempotent, so re-running it is safe. It:

- adds the `writer` and `editor` roles, folding any existing `manager` into
  `editor`
- widens the existing `articles` table **in place**, so article votes survive
- adds `categories`, `tags`, `article_tags`, `courses`, `course_articles`
- adds `article_authors` for co-author bylines
- creates the `article_list`, `article_detail`, `public_authors`,
  `category_counts` and `tag_counts` views the site reads from
- enables row-level security on everything
- creates the public `article-images` storage bucket

### Existing databases

`cms-schema.sql` is the fresh-install path — everything below is already folded
into it. A database that predates these changes takes the numbered patches
instead, **in order**:

| File | What it does |
| --- | --- |
| `fix-01-byline-access.sql` | Lets readers resolve article bylines |
| `fix-02-multi-author.sql` | Co-authors, and the per-article editing toggle |
| `fix-03-authors-view-invoker.sql` | `public_authors` runs as invoker |
| `fix-04-advisor-warnings.sql` | Security Advisor cleanups |
| `fix-05-private-helpers.sql` | Moves the security helpers out of the API schema |
| `fix-06-retire-image-bucket.sql` | Serves images from R2 instead of Storage |
| `fix-07-article-trash.sql` | Deleting an article sends it to a trash first |
| `fix-08-groups.sql` | Courses become groups, and groups get their own categories |
| `fix-09-site-settings.sql` | `site_settings`, and the editable page layouts behind the Designer |

Order matters between 02 and 05: `fix-02` adds its helpers to `public`, and
`fix-05` is what relocates them to `private`.

## 2. Deploy the user-management function

Creating an auth user requires the `service_role` key, which must never reach
the browser. That work happens in an Edge Function:

```bash
supabase functions deploy admin-users
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform — no secrets to configure. The function re-authenticates every
request and rejects anyone who is not an admin.

## 3. Make yourself an admin

Sign up through the site as normal, confirm your email, then in the SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

From then on you can manage every other account from `/admin/users`.

## 4. Configure the front end

`public-site/.env` needs no new variables — the CMS uses the same anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 5. Add content

Everything from the original markdown pipeline has already been imported, so a
working database starts populated. Write anything new in the editor at
`/admin/articles`.

> The one-time importer (`scripts/import-content.mjs`) and the markdown sources
> it read have both been removed now that the migration is finished. If you ever
> need to replay it against a fresh database, recover it from git history —
> it preserved each article's UUID so votes stayed attached, and aligned the
> author profile slug so `/author/ryan-jones` kept working.

---

## Roles

| Role | Sees | Can do |
| --- | --- | --- |
| **Reader** (`user`) | Published articles | Vote. No CMS access. |
| **Writer** | Only their own articles | Write, edit and submit for review. **Cannot publish.** |
| **Editor** | Every article | Everything a writer can, plus publish and manage categories and tags. |
| **Admin** | Everything | Everything an editor can, plus create and manage users. |

Two things enforce this, and neither is the React UI:

- **RLS policies** decide which rows a query can return or change. A writer's
  article list is filtered by the database, not by the front end.
- **A trigger** blocks publishing. RLS cannot compare old and new values, so
  `enforce_publish_permission` raises if a non-editor moves an article to
  `published`.

The route guards in `RequireRole` are navigation convenience only. Someone who
bypasses them lands on a screen whose every query returns nothing.

---

## The editor

`/admin/articles/:id` has a side menu with five sections:

| Section | Contents |
| --- | --- |
| **Article** | Title, subtitle, and the body editor |
| **Settings** | Slug, author, previous/next article for lesson series |
| **Metadata** | Excerpt and feature image |
| **Category & Tags** | Category picker and tag input |
| **Publishing** | Status, publish date, validation badges |

The body editor has three tabs — **Visual**, **Markdown**, and **Preview**.

**Markdown is the source of truth.** It is what gets stored and what the
Markdown tab edits directly. The Visual tab (TipTap) renders that markdown,
and converts back on every change.

### What the visual editor preserves

The existing articles contain raw HTML — 82 `<iframe>` embeds, 62 `<figure>`
blocks, and inline coloured `<span>`s. A stock WYSIWYG discards all of it.

- `<figure>` and `<iframe>` parse into a **RawHtmlBlock** atom node, shown as a
  dashed, uneditable card and written back byte-for-byte on save
- inline `<span style="…">` survives via TipTap's TextStyle mark
- code blocks keep their language

Only the Markdown tab can edit the inside of an embed — the Visual tab shows it
but treats it as opaque.

### Why the render pipeline is pinned

`public-site/src/lib/markdown.ts` was written to match the old build pipeline's
output exactly: same heading ids, same highlight.js classes, same excerpt
injection, same reading-time rounding. That mattered during the migration —
an article saved from the CMS had to render identically to the one built from
markdown, or the first save would silently rewrite every article's HTML.

The old pipeline is gone, but the constraint outlives it: these rules now
describe how every already-published article is stored. Changing one re-renders
existing HTML on the next save.

> `marked` is pinned to **17.0.1** for the same reason. marked 18 renders tables
> differently, which would rewrite any article containing one.

### Known normalization

Opening an article in the **Visual** tab and saving normalizes three things that
no reader can see: a soft line break inside a list item becomes a space,
`&Omega;` becomes `Ω`, and `allowfullscreen` becomes `allowfullscreen=""`. The
rendered output is unchanged. Editing in the **Markdown** tab avoids all of it.

---

## What changed in the public site

Every listing page previously imported `src/data/*.json` at build time. They now
read from Supabase through `src/hooks/useContent.ts`, which caches each dataset
once per session so navigation does not refetch.

`src/data/articles/*.json` is **stale** — the built output of the retired
pipeline, read by nothing. `src/data/changelog.json` is the exception: it is
still a build-time import and is authored by hand.

The CMS is lazy-loaded. TipTap, ProseMirror, turndown and highlight.js total
about 1 MB, and none of it is in the reader's bundle — the entry chunk has no
static import of any of it. Verify after a build with:

```bash
grep -c 'hljs\|turndown' dist/assets/index-*.js   # entry chunk should be 0
```

## The Designer

`/admin/designer` — **Designer**, admin only — is the site's three laid-out
pages as lists of sections rather than as code. One tab per page: **Front
page**, **Category pages**, **Tag pages**. Sections move up and down, switch
off without being deleted, and each carries its own settings: which tag or
category an article carousel draws from, which group category a group shelf
draws from, where the random quote sits.

The three arrangements live in `site_settings` as JSON documents, under
`home_layout`, `category_layout` and `tag_layout`. Three things follow from
that:

- **No row is the normal state.** Until someone saves, each page renders its
  entry in `DEFAULT_LAYOUTS` from `src/types/pageLayout.ts` — the layouts the
  site shipped with. "Reset to original" deletes that one row rather than
  writing the default into it, and leaves the other two pages alone.
- **The shape is validated in TypeScript, not in Postgres.** `jsonb` will
  accept anything, so `normalizePageLayout` repairs whatever it reads —
  a missing field falls back to its default, an unknown section type is
  dropped. A layout saved by an older version of the designer keeps working.
- **One layout covers every archive.** There is no per-category or per-tag
  layout; `category_layout` is what every `/category/…` page renders, and
  `tag_layout` every `/tag/…` page. The preview's dropdown picks which real
  category or tag to render the layout against.

Most section types work on any of the three pages. Two are archive-only, and
the Add menu offers them only there:

| Section | Where | What it is |
| --- | --- | --- |
| Page header | Category, Tag | Breadcrumb, name, description, article count |
| Article list | Category, Tag | The archive's own articles, as a grid or a list |
| Articles | Anywhere | A carousel filtered by tag or category |
| Groups | Anywhere | A carousel of groups from one group category |
| Search bar, Category pills, Random quote, Text block | Anywhere | As on the front page |

The preview beside the section list is the real `PageSections` component with
the real content, so there is no second rendering of any page to drift out of
step. Each tab keeps its own unsaved state while the screen is open, and its
tab wears an "Unsaved" badge until you save it. A save is live immediately;
there is no draft, which is why this screen is admin-only while articles and
groups are open to editors.

## Publishing workflow

1. A **writer** creates an article, saves drafts, then submits for review
   (`draft` → `in_review`).
2. An **editor** sees it in the "Waiting for review" queue on the dashboard,
   edits if needed, and publishes.
3. A publish date in the future keeps the article hidden until then — the RLS
   policy filters on `published_at <= NOW()`, so scheduling needs no cron job.

## What was not migrated

- **`changelog.json`** is still a build-time import; the changelog is generated
  from git history, not authored content.
