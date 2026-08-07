# STEAM Reader CMS — Setup

The public site is now backed by a database-driven CMS at `/admin`. Content
lives in Supabase; the markdown build pipeline in `md-articles/` is no longer
the source of truth.

Work through the steps in order — the import in step 5 depends on everything
before it.

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
- creates the `article_list`, `article_detail`, `public_authors`,
  `category_counts` and `tag_counts` views the site reads from
- enables row-level security on everything
- creates the public `article-images` storage bucket

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

## 5. Import the existing articles

This moves the 18 built articles, plus categories, tags and courses, into the
database. Run it once, from `public-site/`:

```bash
# Preview without writing anything
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  node scripts/import-content.mjs --author you@example.com --dry-run

# Then for real
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  node scripts/import-content.mjs --author you@example.com
```

The script reads `public-site/.env` itself for the project URL, so only the
service_role key needs passing in. A real environment variable always wins over
the file, and the key stays out of anything committed.

The importer reads the original markdown from `md-articles/content/` where it
can, so articles open in the editor as markdown rather than as HTML. It keeps
each article's existing UUID, so **votes stay attached**. It also aligns your
profile slug with the old author slug so `/author/ryan-jones` keeps working.

Re-running is safe: it upserts by id and replaces tag links rather than
appending.

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

### Why the render pipeline is duplicated

`public-site/src/lib/markdown.ts` deliberately mirrors
`md-articles/scripts/lib/article-processor.ts`: same heading ids, same
highlight.js classes, same excerpt injection, same reading-time rounding.

An article saved from the CMS must render identically to one built from a
markdown file, or the first save would silently rewrite every article's HTML.
`src/lib/test.ts` asserts this against real articles — if you change one
pipeline, change the other, and the tests will tell you if you missed something.

> `marked` is pinned to **17.0.1** in `public-site` to match `md-articles`.
> marked 18 renders tables differently and breaks byte-equality. Upgrade both
> together or not at all.

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

`src/data/*.json` is now **stale** — kept only as the importer's input and as
test fixtures. Delete it once the import is verified.

The CMS is lazy-loaded. TipTap, ProseMirror, turndown and highlight.js total
about 1 MB, and none of it is in the reader's bundle — the entry chunk has no
static import of any of it. Verify after a build with:

```bash
grep -c 'hljs\|turndown' dist/assets/index-*.js   # entry chunk should be 0
```

## Publishing workflow

1. A **writer** creates an article, saves drafts, then submits for review
   (`draft` → `in_review`).
2. An **editor** sees it in the "Waiting for review" queue on the dashboard,
   edits if needed, and publishes.
3. A publish date in the future keeps the article hidden until then — the RLS
   policy filters on `published_at <= NOW()`, so scheduling needs no cron job.

## What was not migrated

- **`md-articles/`** still works and still writes to `src/data/`. It is now a
  parallel path that the site no longer reads. Retire it once you are happy
  with the CMS, or keep it for bulk authoring and re-run the importer.
- **`changelog.json`** is still a build-time import; the changelog is generated
  from git history, not authored content.
