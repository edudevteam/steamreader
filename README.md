# STEAM Reader

A blog site for Science, Technology, Engineering, Arts, and Mathematics education content.

The repo holds two apps:

| Folder | What it is | Where it runs |
| --- | --- | --- |
| [`public-site/`](public-site) | The site readers see. Read-only: no login, no database. | Cloudflare Pages |
| [`studio/`](studio) | The editor used to write and publish articles. | Your computer only |

```
studio/content  ──Publish──▶  R2 bucket "steamreader"  ──▶  public-site (steamreader.com)
 (git, drafts)                data/*.json + images             fetches the JSON
```

Articles are JSON files in `studio/content/`, committed to git. Publishing
uploads the published ones to Cloudflare R2, alongside the images. The public
site fetches them from `https://cdn.steamreader.com/data/`. Nothing on the
public site can change content, so there is no account, API or database for
anyone to attack.

## Features

- **Local Studio** - WYSIWYG markdown editor, drafts, groups (courses), taxonomy, authors and a page Designer
- **Category & Tag Filtering** - Browse articles by category, tag, or author
- **Search** - Search articles by title, author, category, or tags
- **Groups** - Arrange articles into an ordered, multi-part series
- **Social Sharing** - Share buttons for Twitter, Facebook, LinkedIn, and Email
- **Responsive Design** - Mobile-friendly with collapsible navigation
- **Changelog System** - Public changelog page, RSS feed, and version endpoint

## Tech Stack

- React 18 + TypeScript, Vite, TailwindCSS, React Router
- Cloudflare R2 for content JSON and images
- Cloudflare Pages for hosting

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Public site

```bash
cd public-site
pnpm install
pnpm dev        # http://localhost:5173, reading the live published content
pnpm build      # production build into dist/
```

`VITE_CONTENT_BASE_URL` in `public-site/.env` points the site at a different
content location. It defaults to `https://cdn.steamreader.com/data`.

### Studio

```bash
cd studio
pnpm install
pnpm start      # http://127.0.0.1:5180
```

See [studio/README.md](studio/README.md) for the R2 token, how publishing
works and where content lives.

## Project Structure

```
public-site/
├── scripts/generate-changelog-assets.mjs
├── src/
│   ├── components/          # Layout, page sections, carousels
│   ├── pages/               # Route pages
│   ├── lib/content.ts       # Fetches the published JSON
│   ├── hooks/useContent.ts  # Per-session caching of that JSON
│   ├── data/changelog.json  # Changelog entries (edit manually)
│   └── types/               # Shared with the Studio
└── public/

studio/
├── content/                 # The articles, authors, groups... (source of truth)
├── server/                  # Local API: file store, publish build, R2 upload
└── src/                     # Editor screens; reuses public-site/src for previews
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page, laid out in the Studio's Designer |
| `/article/:slug` | Full article view |
| `/category/:slug` | Articles filtered by category |
| `/tag/:slug` | Articles filtered by tag |
| `/author/:slug` | Articles by author |
| `/group/:slug` | A group and its ordered lessons (`/course/:slug` redirects here) |
| `/latest` | All articles, newest first |
| `/search` | Search page with filters |
| `/changelog` | Public changelog of site updates |

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

## License

MIT
