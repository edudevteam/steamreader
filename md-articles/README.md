# MD Articles

This directory contains the markdown source files for all articles. The build scripts process these files and output JSON to the `public-site` for rendering.

## Directory Structure

```
md-articles/
├── content/
│   ├── YYYY-MM-DD-article-slug.md    # Article files
│   ├── images/                        # Shared images for all articles
│   └── media/                         # Shared audio/video files
├── scripts/                           # Build scripts
├── package.json
└── README.md
```

## Article File Naming

Articles must follow this naming convention:

```
YYYY-MM-DD-article-slug.md
```

Examples:
- `2024-01-15-intro-to-robotics.md`
- `2025-06-20-python-requirements.md`

The date prefix determines the publish date, and the slug (everything after the date) becomes the URL path.

## Commands

Run these from the `md-articles` directory:

```bash
# Install dependencies (first time only)
pnpm install

# Build all articles
pnpm build

# Build a single article
pnpm build:article <slug>

# List all articles
pnpm run list

# Delete an article
pnpm run delete <slug>
```

Note: `list` and `delete` use `pnpm run` because they conflict with pnpm's built-in commands.

## Frontmatter Reference

Each article requires YAML frontmatter at the top of the file between `---` markers.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | The article title |
| `author` | string | Author's display name |
| `date` | string | Publish date (YYYY-MM-DD) |
| `category` | string | Single category name |
| `feature_image` | string | Path to feature image (e.g., `/images/my-image.png`) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `subtitle` | string | Subtitle displayed below the title |
| `author_slug` | string | URL-safe author identifier (auto-generated if omitted) |
| `updated` | string | Last updated date (YYYY-MM-DD) |
| `tags` | string[] | List of tags |
| `feature_image_alt` | string | Alt text for feature image |
| `feature_image_caption` | string | Caption displayed below feature image |
| `excerpt` | string | Short description (auto-generated from content if omitted) |
| `status` | string | `published` or `draft` (defaults to `published`) |
| `prev` | string | Slug of the previous article in a series |
| `next` | string | Slug of the next article in a series |

### Validation Badges (Optional)

| Field | Type | Description |
|-------|------|-------------|
| `validated_tutorial` | boolean | Tutorial has been tested and verified |
| `supported_evidence` | boolean | References and links have been verified |
| `community_approved` | number | Number of community approvals |

## Example Article

```markdown
---
title: 'Getting Started with Python'
subtitle: 'A beginner-friendly introduction'
author: 'Ryan Jones'
author_slug: 'ryan-jones'
date: '2025-01-15'
category: 'Technology'
tags:
  - python
  - tutorial
  - beginner
feature_image: '/images/python-intro-banner.png'
feature_image_alt: 'Python programming introduction'
feature_image_caption: 'Learn Python from scratch'
excerpt: 'Learn the basics of Python programming in this comprehensive guide for beginners.'
status: published
validated_tutorial: true
---

## Introduction

Your article content goes here...

### Code Examples

Use fenced code blocks with language identifiers:

```python
print("Hello, World!")
```

### Images

Reference images from the shared images folder:

![Description](/images/my-image.png)
```

## Images and Media

### Images

Place all images in the `content/images/` directory. Reference them in your articles using:

```markdown
![Alt text](/images/filename.png)
```

Or for the feature image in frontmatter:

```yaml
feature_image: '/images/filename.png'
```

During build, all images are automatically copied to `public-site/public/images/`.

### Media (Audio/Video)

Place audio and video files in the `content/media/` directory. These can be referenced in your articles as needed.

## Build Output

The build process generates:

- `public-site/src/data/articles/<slug>.json` - Individual article data
- `public-site/src/data/articles.json` - Article index
- `public-site/src/data/categories.json` - Categories index
- `public-site/src/data/tags.json` - Tags index
- `public-site/src/data/authors.json` - Authors index
- `public-site/public/images/*` - Copied images

## Draft Articles

To save an article as a draft (not published), set:

```yaml
status: draft
```

Draft articles will not be included in the build output.

## Article Series

To link articles in a series, use the `prev` and `next` fields with the target article's slug:

```yaml
prev: intro-to-python
next: python-advanced-topics
```

This creates navigation links between articles.
