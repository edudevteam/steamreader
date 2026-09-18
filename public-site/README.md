![reactjs-vite-tailwindcss-boilerplate](https://user-images.githubusercontent.com/16243531/217138979-b854309c-4742-4275-a705-f9fec5158217.jpg)

# STEAM Reader

The public, read-only half of STEAM Reader. It has no login and no database:
every page is built from JSON that the [Studio](../studio) publishes to
Cloudflare R2. See the [repo README](../README.md) for how the two fit together.

## Tech Stack

Vite, React 18, TypeScript, React Router, TailwindCSS 3, Vitest, Testing
Library, ESLint and Prettier.

## Getting Started

### Install

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

Articles, categories, tags, authors, groups and page layouts are all written
in the Studio (`../studio`) and published as JSON under
`https://cdn.steamreader.com/data/`. `src/lib/content.ts` fetches them, and
`src/hooks/useContent.ts` caches them for the session.

**Scheduling:** an article with a future publish date is hidden from listings
until that date.

`src/data/` holds the JSON snapshot from before the move to R2. The Studio's
`import:snapshot` script reads it; the site itself uses only
`data/changelog.json`.

## Categories and Tags

### Category Colors

Colors are still hardcoded in [src/pages/Categories/index.tsx](src/pages/Categories/index.tsx):

```typescript
const categoryColors: Record<string, string> = {
  tutorial: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  science: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
}
```

Categories without a mapping use the default gray style. Categories also carry
a `color` field in `site.json`, which the page above doesn't read yet. Wiring
that up would remove this hardcoded map.

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
