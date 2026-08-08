# STEAM Reader

A blog site for Science, Technology, Engineering, Arts, and Mathematics education content, published through a built-in CMS backed by Supabase.

## Features

- **Built-in CMS** - Write and publish from `/admin`: a WYSIWYG markdown editor, draft/review/published workflow, courses, taxonomy and user management
- **Category & Tag Filtering** - Browse articles by category, tag, or author
- **Full-Text Search** - Search articles by title, author, category, or tags
- **Courses** - Group articles into an ordered, multi-part series
- **Social Sharing** - Share buttons for Twitter, Facebook, LinkedIn, and Email
- **Responsive Design** - Mobile-friendly with collapsible navigation
- **Changelog System** - Public changelog page, RSS feed, and version endpoint

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + Typography plugin
- React Router
- Supabase (Postgres, auth, RLS) for content
- Cloudflare R2 for images

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
cd public-site
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
pnpm build
pnpm serve  # Preview the build
```

## Project Structure

```
public-site/
├── scripts/                         # Build tools
│   ├── generate-changelog-assets.mjs
│   └── migrate-supabase-images-to-r2.mjs
├── src/
│   ├── components/
│   │   ├── admin/                   # CMS editor and admin widgets
│   │   └── layout/                  # Header, Footer, PageLayout
│   ├── pages/                       # Route pages
│   │   └── admin/                   # CMS screens
│   ├── lib/                         # Supabase client, content queries, markdown
│   ├── data/
│   │   └── changelog.json           # Changelog entries (edit manually)
│   ├── types/                       # TypeScript interfaces
│   └── router/                      # Route configuration
└── public/
    ├── version.json                 # Generated — latest changelog entry
    └── rss.xml                      # Generated — RSS feed
```

Article content is not in this repo — it lives in Supabase. Images are served
from Cloudflare R2.

## Writing Articles

Articles are written and published in the CMS at `/admin`, which is part of the
site itself. There is no build step and nothing to commit: saving in the editor
writes to Supabase, and the change is live as soon as the article is published.

1. Sign in and open **`/admin/articles`**
2. **New article** opens the WYSIWYG editor. Content is stored as markdown, so
   switching between the visual editor and markdown is lossless.
3. Fill in the sidebar — category, tags, feature image, authors, excerpt
4. Set **status** to `published` (the publish date defaults to now; a future
   date schedules it)

Images dropped into the editor upload to R2 automatically.

Courses — an ordered, multi-part series of articles — are managed separately at
**`/admin/courses`**, where lessons are added and dragged into order.

See [CMS-SETUP.md](CMS-SETUP.md) for the database schema, roles and permissions.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page with featured and latest articles |
| `/article/:slug` | Full article view |
| `/category/:slug` | Articles filtered by category |
| `/tag/:slug` | Articles filtered by tag |
| `/author/:slug` | Articles by author |
| `/course/:slug` | A course and its ordered lessons |
| `/latest` | All articles, newest first |
| `/search` | Search page with filters |
| `/changelog` | Public changelog of site updates |
| `/admin` | CMS — articles, courses, taxonomy, users |

## Changelog & Versioning

The site includes a changelog system that tracks public-facing changes. It is powered by a single JSON file and generates static assets at build time.

### How It Works

```
src/data/changelog.json   (you edit this manually)
        │
        ├──→  /changelog page       (React renders it at runtime)
        ├──→  public/version.json   (generated at build time)
        └──→  public/rss.xml        (generated at build time)
```

- **`/changelog`** — A page listing all changes, visible to users
- **`/version.json`** — Contains the latest version entry; used for in-app banners and Telegram bot checks
- **`/rss.xml`** — Standard RSS 2.0 feed for external subscribers

### Adding a Changelog Entry

Edit `src/data/changelog.json` and prepend a new entry at the top of the array:

```json
[
  {
    "version": "1.3.0",
    "date": "2026-03-01",
    "title": "Short title of the change",
    "description": "A sentence or two describing what changed and why.",
    "type": "feature"
  }
]
```

**Entry fields:**

| Field | Required | Values |
|-------|----------|--------|
| `version` | Yes | Semver string (e.g. `"1.3.0"`) |
| `date` | Yes | ISO date (`"YYYY-MM-DD"`) |
| `title` | Yes | Short title for the change |
| `description` | Yes | One or two sentences describing the change |
| `type` | Yes | `"feature"`, `"content"`, `"fix"`, or `"improvement"` |

### Generating Assets

The build script automatically generates `version.json` and `rss.xml` before each production build. You can also run it manually:

```bash
pnpm changelog:generate
```

To customize the site URL used in the RSS feed, set the `SITE_URL` environment variable:

```bash
SITE_URL=https://yourdomain.com pnpm build
```

### Consuming version.json

**In-app banner example:**

```js
const res = await fetch('/version.json')
const { version, title } = await res.json()
// Compare with last-known version to decide whether to show a banner
```

**Telegram bot check:**

Poll `/version.json` periodically and send a message when the version changes.

## Customization

### Categories

Default STEAM categories are configured in the Header and Footer components:

- Science
- Technology
- Engineering
- Arts
- Mathematics

### Theme Colors

STEAM-specific colors are defined in `tailwind.config.mjs`:

```js
colors: {
  steam: {
    science: '#3B82F6',      // Blue
    technology: '#10B981',   // Green
    engineering: '#F59E0B',  // Amber
    arts: '#EC4899',         // Pink
    mathematics: '#8B5CF6'   // Purple
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Generate changelog assets + production build |
| `pnpm changelog:generate` | Generate version.json and rss.xml from changelog |
| `pnpm serve` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm migrate:r2:supabase` | One-off: copy Supabase-hosted images to R2 and rewrite their URLs |

## License

MIT
