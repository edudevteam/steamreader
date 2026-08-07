# R2 Image Storage

Images live in the Cloudflare R2 bucket `steamreader` and are served from
`https://cdn.steamreader.com`. This replaces the Supabase Storage bucket
`article-images`.

## Why there is a Function now

Supabase Storage let the browser upload directly, because RLS could read the
caller's JWT and decide whether to allow it. R2 has no equivalent — a bucket
binding is all-or-nothing, and there is no per-user rule layer.

So uploads go through a Cloudflare Pages Function at
[`functions/api/upload.ts`](functions/api/upload.ts). It verifies the Supabase
session, looks up the caller's role in `profiles`, and only then writes to the
bucket. **That Function is the authorization boundary** that the storage RLS
policies used to be. The matching checks in
[`uploads.ts`](public-site/src/lib/cms/uploads.ts) are there for fast feedback
only — they are not a security control.

Reads need no Function. The custom domain serves the bucket publicly through
Cloudflare's cache.

```
upload   browser ──JWT + file──▶ /api/upload ──binding──▶ R2 bucket
read     browser ◀──────────── cdn.steamreader.com ◀───── R2 bucket
```

---

## 1. Custom domain on the bucket

1. **R2** → `steamreader` → **Settings** → **Public access** → **Custom domains**
2. Connect `cdn.steamreader.com`

The DNS record is created for you because the zone is already in this account.
Do **not** enable the `r2.dev` public URL — the custom domain replaces it and
`r2.dev` is rate limited and uncacheable.

Verify before going further:

```bash
# 404 is the correct answer for a key that does not exist yet.
# Connection or TLS errors mean the domain is not wired up.
curl -I https://cdn.steamreader.com/does-not-exist
```

## 2. Bind the bucket to the Pages project

**Workers & Pages** → the Pages project → **Settings** → **Bindings** → **Add**
→ **R2 bucket**

| Variable name    | Bucket        |
| ---------------- | ------------- |
| `ARTICLE_IMAGES` | `steamreader` |

Add it to **both** Production and Preview, or uploads break on preview
deployments.

## 3. Plain-text variables on the Pages project

**Settings** → **Environment variables**. Only one is new:

| Variable                 | Value                          |
| ------------------------ | ------------------------------ |
| `R2_PUBLIC_BASE_URL`     | `https://cdn.steamreader.com`  |
| `VITE_SUPABASE_URL`      | already set — the Function reuses it |
| `VITE_SUPABASE_ANON_KEY` | already set — the Function reuses it |

The Function reads the same two Supabase variables the browser bundle uses. The
`VITE_` prefix is a Vite build-time convention and means nothing to Cloudflare;
every Pages variable reaches a Function through `env` whatever it is named.
Keeping unprefixed duplicates would just be a second copy to forget when the
anon key is rotated.

Plain text is right for all three. The anon key is already compiled into the
client bundle and served to every visitor — its safety comes from RLS, not from
secrecy — and the other two are public URLs. Marking them as secrets would
protect nothing while making them unreadable when you need to verify them.

The anon key is also the *correct* key here: the Function validates the
**caller's** token against Supabase and never needs elevated rights. There is
deliberately no service role key on the Pages project.

**Redeploy after adding bindings.** They are only picked up by a new
deployment, not applied to the running one.

---

## 4. Migrating the existing images

Both scripts are idempotent and support `--dry-run`. Run the dry run first —
it prints every object and every file it would touch without writing anything.

### Credentials

The scripts run on your machine, so they cannot use the binding. They talk to
R2 over its S3-compatible API instead.

**R2** → **API** → **Manage API tokens** → **Create API token**, with **Object
Read & Write** on the `steamreader` bucket. Then:

```bash
cd public-site

export R2_ACCOUNT_ID=...            # R2 overview page, right-hand sidebar
export R2_ACCESS_KEY_ID=...         # shown once, when the token is created
export R2_SECRET_ACCESS_KEY=...     # likewise
export R2_BUCKET=steamreader
export R2_PUBLIC_BASE_URL=https://cdn.steamreader.com

export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...  # Supabase → Settings → API
```

The service role key is required because the scripts rewrite rows belonging to
every author, which is exactly what RLS exists to prevent. Do not put this key
anywhere near the Pages project.

### Run them

```bash
# 1. Supabase Storage → R2, then rewrite the stored URLs
pnpm migrate:r2:supabase -- --dry-run
pnpm migrate:r2:supabase

# 2. Committed public/images → R2, then rewrite JSON, markdown and DB rows
pnpm migrate:r2:public -- --dry-run
pnpm migrate:r2:public
```

What each one does:

| Script                    | Copies                     | To key           | Rewrites                                                                                             |
| ------------------------- | -------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `migrate:r2:supabase`     | `article-images` bucket    | same path        | `articles.feature_image` / `content_markdown` / `content_html`, `courses.feature_image`, `profiles.avatar_url` |
| `migrate:r2:public`       | `public-site/public/images`| `static/<name>`  | `src/data/**/*.json`, `md-articles/content/**/*.md`, and the same DB columns                          |

The second script leaves `public/images` on disk by default so you can compare
the site against it. Once you are satisfied:

```bash
pnpm migrate:r2:public -- --delete-local
```

Any `/images/...` reference with no matching file is left exactly as it was and
listed at the end of the run. Those are already broken today — the path is not
in `public/images` — so the migration neither fixes nor worsens them.

**There is one such reference right now**, inherited from before this change:

```
/images/articles/placeholder.jpg
  md-articles/content/2026-02-01-build-a-website-with-publii.md
  md-articles/content/2026-02-01-build-a-website-using-prompt-engineering.md
```

`public/images/articles/` does not exist, so both articles have a dead feature
image. Worth fixing, but unrelated to R2.

### After migrating

- Redeploy so the rewritten JSON ships.
- Spot-check an article, a course card, and an author avatar.
- Only then retire the Supabase bucket — see step 6.

---

## 5. Local development

The Vite dev server knows nothing about Pages Functions, so `/api/upload` 404s
under plain `pnpm dev`. Everything except uploading works.

To run the Function too:

```bash
cp .dev.vars.example .dev.vars   # repo root, fill it in

cd public-site
pnpm build                       # wrangler serves dist/
pnpm dev:functions               # wrangler on :8788
pnpm dev                         # vite on :5173, proxies /api → :8788
```

`--r2 ARTICLE_IMAGES` gives you a *local simulated* bucket. Uploads succeed and
return `cdn.steamreader.com` URLs, but the bytes stay on your machine, so the
resulting image will 404 in the preview. That is expected locally.

---

## 6. Retiring the Supabase bucket

Only after the site has been verified against R2, and only once you are happy
you will not need to roll back. Nothing in the migration deletes it for you.

```sql
-- supabase/fix-06-retire-image-bucket.sql
```

Rolling back before this point is just a matter of reverting the code — the
Supabase objects are still there and still public.

---

## Notes

- **Cache.** Uploaded keys are timestamped and served `immutable` with a
  one-year TTL. Migrated keys are stable paths with the same TTL but no
  `immutable`, so replacing one in place is possible — purge the Cloudflare
  cache for that URL if you do.
- **SVG.** Accepted, as it was before. It is served from `cdn.steamreader.com`
  rather than the app origin, so a script inside an SVG cannot reach a
  `steamreader.com` session — but note that a contributor uploading an SVG is
  publishing active content, and only contributors can upload.
- **Size limit.** 5 MB, enforced in the Function. Raising it means changing
  `MAX_BYTES` in both `functions/api/upload.ts` and `uploads.ts`.
- **Deletes.** Nothing deletes from R2 today. Removing an image from an article
  unlinks it but leaves the object, same as the previous Supabase behaviour.
