![reactjs-vite-tailwindcss-boilerplate](https://user-images.githubusercontent.com/16243531/217138979-b854309c-4742-4275-a705-f9fec5158217.jpg)

# React Tailwindcss Boilerplate build with Vite

This is a boilerplate build with Vite, React 18, TypeScript, Vitest, Testing Library, TailwindCSS 3, Eslint and Prettier.

## What is inside?

This project uses many tools like:

- [Vite](https://vitejs.dev)
- [ReactJS](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Tailwindcss](https://tailwindcss.com)
- [Eslint](https://eslint.org)
- [Prettier](https://prettier.io)

## Getting Started

### Install

Create the project.

```bash
pnpm dlx degit joaopaulomoraes/reactjs-vite-tailwindcss-boilerplate my-app
```

Access the project directory.

```bash
cd my-app
```

Install dependencies.

```bash
pnpm install
```

Serve with hot reload at <http://localhost:5173>.

```bash
pnpm run dev
```

### Lint

```bash
pnpm run lint
```

### Typecheck

```bash
pnpm run typecheck
```

### Build

```bash
pnpm run build
```

### Test

```bash
pnpm run test
```

View and interact with your tests via UI.

```bash
pnpm run test:ui
```

## Articles

Articles are stored as Markdown files in `content/articles/`. Each article lives in its own directory with the format `YYYY-MM-DD-slug-name/index.md`.

### Building Articles

```bash
npm run articles:build   # Build all articles
npm run articles:list    # List all articles
npm run articles:delete  # Delete an article
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Article title |
| `subtitle` | No | Subtitle or tagline |
| `author` | Yes | Author name |
| `author_slug` | No | Author URL slug (auto-generated from name if omitted) |
| `date` | Yes | Publication date (YYYY-MM-DD) |
| `updated` | No | Last updated date |
| `category` | Yes | Single category name |
| `tags` | No | Array of tag strings |
| `feature_image` | Yes | Image URL or local path |
| `feature_image_alt` | No | Alt text for feature image |
| `feature_image_caption` | No | Caption for feature image |
| `excerpt` | No | Custom excerpt (auto-generated if omitted) |
| `status` | No | `published` or `draft` (default: `published`) |
| `previous` | No | Slug of previous article in a series |
| `next` | No | Slug of next article in a series |
| `validated_tutorial` | No | `true` if tutorial has been verified to work |
| `supported_evidence` | No | `true` if references have been verified |
| `community_approved` | No | Number of community approvals |

### Article Series

Use `previous` and `next` to link articles in a tutorial series:

```yaml
---
title: "Part 2: Building Components"
author: "Jane Doe"
date: "2024-01-15"
category: "Tutorials"
feature_image: "https://example.com/image.jpg"
previous: "part-1-getting-started"
next: "part-3-advanced-patterns"
---
```

The values should be article slugs (directory name without the date prefix). The build process resolves these to include the article title for display.

## Categories

Categories are managed through a single JSON file. Changes automatically update the footer, categories page, and individual category pages.

### Category Data File

Edit `src/data/categories.json`:

```json
{
  "categories": [
    { "slug": "tutorial", "name": "Tutorial" },
    { "slug": "technology", "name": "Technology" }
  ]
}
```

### Adding a Category

Add a new object to the `categories` array:

```json
{ "slug": "science", "name": "Science" }
```

- `slug`: URL-friendly identifier (lowercase, no spaces)
- `name`: Display name shown in the UI

Article counts are calculated automatically from the articles data.

### Removing a Category

Delete the category object from the array. Make sure no articles reference this category first.

### Reordering Categories

Change the order of objects in the array. The footer and categories page display them in array order.

### Category Colors (Optional)

To customize category colors on the categories page, edit `src/pages/Categories/index.tsx`:

```typescript
const categoryColors: Record<string, string> = {
  tutorial: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  science: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  technology: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
}
```

Categories without a color mapping use the default gray style.

## H5P Interactive Content

[H5P](https://h5p.org) is an open-source framework for creating interactive content like quizzes, presentations, interactive videos, and more.

### Embedding H5P Content

To embed H5P content in your articles, use an iframe. You can host H5P content on [H5P.com](https://h5p.com) or your own H5P server.

**In Markdown articles:**

```html
<iframe
  src="https://h5p.org/h5p/embed/123456"
  width="100%"
  height="400"
  frameborder="0"
  allowfullscreen="allowfullscreen"
  allow="geolocation *; microphone *; camera *; midi *; encrypted-media *"
></iframe>
```

**In React components:**

```jsx
<iframe
  src="https://h5p.org/h5p/embed/123456"
  width="100%"
  height={400}
  frameBorder={0}
  allowFullScreen
  allow="geolocation *; microphone *; camera *; midi *; encrypted-media *"
/>
```

### Getting the Embed URL

1. Create your H5P content on [H5P.com](https://h5p.com) or your H5P server
2. Open the content and click "Embed"
3. Copy the `src` URL from the embed code
4. Replace the URL in the iframe examples above

### Responsive Embedding

For responsive H5P embeds that maintain aspect ratio:

```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://h5p.org/h5p/embed/123456"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allowfullscreen="allowfullscreen"
  ></iframe>
</div>
```

## License

This project is licensed under the MIT License.
