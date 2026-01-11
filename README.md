# STEAM Reader

A markdown-powered blog site for Science, Technology, Engineering, Arts, and Mathematics education content.

## Features

- **Markdown Articles** - Write articles in Markdown with frontmatter metadata
- **Category & Tag Filtering** - Browse articles by category, tag, or author
- **Full-Text Search** - Search articles by title, author, category, or tags
- **Social Sharing** - Share buttons for Twitter, Facebook, LinkedIn, and Email
- **Responsive Design** - Mobile-friendly with collapsible navigation
- **CLI Tool** - Manage articles from the command line

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + Typography plugin
- React Router

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
├── content/
│   └── articles/                    # Markdown source files
│       └── YYYY-MM-DD-article-slug/
│           ├── index.md             # Article content
│           └── images/              # Article images
├── scripts/                         # CLI tools
├── src/
│   ├── components/
│   │   └── layout/                  # Header, Footer, PageLayout
│   ├── pages/                       # Route pages
│   ├── data/                        # Generated JSON (from CLI)
│   ├── types/                       # TypeScript interfaces
│   └── router/                      # Route configuration
└── public/
    └── images/articles/             # Processed images
```

## Writing Articles

### 1. Create Article Folder

Create a new folder in `content/articles/` with the naming convention:

```
YYYY-MM-DD-article-slug/
├── index.md
└── images/
    └── feature.jpg (optional)
```

### 2. Write Frontmatter

Each article needs frontmatter at the top of `index.md`:

```yaml
---
title: "Your Article Title"
subtitle: "Optional Subtitle"
author: "Author Name"
author_slug: "author-name"
date: "2024-01-15"
category: "Science"
tags:
  - chemistry
  - experiments
  - beginner
feature_image: "https://example.com/image.jpg"
feature_image_alt: "Description of image"
feature_image_caption: "Photo credit"
excerpt: "A brief description of the article..."
status: published
---

Your markdown content here...
```

### 3. Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Article title |
| `subtitle` | No | Secondary title |
| `author` | Yes | Author's display name |
| `author_slug` | No | URL-friendly author ID (auto-generated if omitted) |
| `date` | Yes | Publication date (YYYY-MM-DD) |
| `category` | Yes | Single category (Science, Technology, Engineering, Arts, Mathematics) |
| `tags` | No | Array of tags |
| `feature_image` | Yes | URL or local path to feature image |
| `feature_image_alt` | No | Alt text for accessibility |
| `feature_image_caption` | No | Image caption/credit |
| `excerpt` | No | Article summary (auto-generated if omitted) |
| `status` | No | `published` or `draft` (default: published) |

## CLI Commands

### Build Articles

Convert markdown articles to JSON:

```bash
# Build all articles
pnpm articles:build

# Build a specific article
pnpm articles:build -- -s article-slug
```

### List Articles

View all articles in the content directory:

```bash
pnpm articles:list
```

### Delete Article

Remove an article:

```bash
pnpm articles:delete article-slug
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page with featured and latest articles |
| `/article/:slug` | Full article view |
| `/category/:slug` | Articles filtered by category |
| `/tag/:slug` | Articles filtered by tag |
| `/author/:slug` | Articles by author |
| `/search` | Search page with filters |

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
| `pnpm build` | Production build |
| `pnpm serve` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm articles:build` | Build articles from markdown |
| `pnpm articles:list` | List all articles |
| `pnpm articles:delete` | Delete an article |

## License

MIT
