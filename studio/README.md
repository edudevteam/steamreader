# STEAM Reader Studio

The Studio is where STEAM Reader articles are written and published. It runs
**only on your computer**, and the public site has no login, database or
admin area. When you publish, the Studio uploads plain JSON files to the
`steamreader` R2 bucket, and the site reads those files.

```
studio/content/*.json  ──Publish site──▶  R2: steamreader/data/*.json  ──▶  steamreader.com
      (git, drafts)                         (published only)                (read only)
```

## Running it

```bash
cd studio
pnpm install
cp .env.example .env    # then fill in the R2 token, see below
pnpm start              # opens http://127.0.0.1:5180
```

You can write, edit and preview without `.env`. You only need it for image
uploads and publishing.

### The R2 token

Go to **Cloudflare → R2 → Manage API tokens → Create API token**:

- Permissions: **Object Read & Write**
- Buckets: **Apply to specific buckets only → `steamreader`**

Copy the Access Key ID and Secret Access Key into `.env`. The Account ID is in
the right-hand sidebar of the R2 overview page. `.env` is gitignored. Only the
Studio's local server reads it, and the browser tab never sees it.

## Where content lives

`studio/content/` is the source of truth. It is committed to git, so git is
also the backup and the edit history.

| File | Holds |
| --- | --- |
| `articles/<slug>.json` | One article, including drafts and the trash |
| `authors.json` | Bylines: name, slug, bio, photo, links |
| `categories.json`, `tags.json` | Article taxonomy |
| `groups.json`, `group-categories.json` | Groups (courses) and their lessons |
| `layouts.json` | Designer layouts for the front, category and tag pages |
| `published.json` | What was last uploaded, used to work out what changed |

**Commit after you publish.** That records what went live, and it means you
can get everything back if this computer is lost.

## Publishing

Saving in the editor only changes files on this computer. **Publish site**
(in the sidebar) is the only thing that touches the live site. It:

1. builds the public JSON from `content/`, keeping only articles whose status
   is **Published** and that aren't in the trash
2. uploads only the files that changed since the last publish
3. deletes files for articles that are no longer public, so an unpublished
   article can't be fetched by its URL either

What it writes to the bucket:

| Key | Contents |
| --- | --- |
| `data/articles/index.json` | Every published article, newest first, without bodies |
| `data/articles/<slug>.json` | One article with its body |
| `data/site.json` | Categories, tags, authors, groups, page layouts |

These are served with `Cache-Control: public, max-age=60`, so readers see a
publish within about a minute. Images are uploaded as soon as you pick them
and are never deleted by a publish.

**Scheduled articles.** A published article with a future date goes out with
the next publish, and the site's listings hide it until that date. The file
itself is already public, though, so anyone who guesses the slug can read it
early. Leave an article as a draft if it must stay private until launch day.

## Preview

The article preview and the Designer use the public site's own components,
imported straight from `public-site/src`. They read the same JSON that
publishing would produce, built on the fly from `content/`, so you see
unpublished changes exactly as readers will.

## Security

The Studio has no login, so two things keep it private:

- It listens on `127.0.0.1` only. Don't change `server.host` in
  `vite.config.ts`, because anyone who can reach the port can publish.
- Every API call has to carry an `x-studio` header, which a browser won't send
  cross-origin. That stops another website open in the same browser from
  making the Studio do things.

The public site stores nothing and accepts no writes, so there is nothing on
it to attack.

## The editor

Markdown is the source of truth. The **Visual** tab (TipTap) renders it and
converts back on every change. `<figure>`, `<iframe>`, galleries and video
embeds are kept byte for byte, and inline coloured `<span>`s survive.

`src/lib/markdown.ts` renders exactly as the original build pipeline did: the
same heading ids, highlight.js classes, excerpt injection and reading-time
rounding. `marked` is pinned to **17.0.1** for the same reason, because
marked 18 renders tables differently. If you change either one, every article
you save afterwards will re-render differently.

**Imported articles.** Articles recovered from the old JSON snapshot have HTML
but no markdown yet. The editor rebuilds the markdown from the HTML the first
time you open one, and the next save stores both. Until you save, the
published HTML is byte-for-byte what the site served before.

To re-run the import (this overwrites `content/`):

```bash
pnpm import:snapshot -- --force
```
