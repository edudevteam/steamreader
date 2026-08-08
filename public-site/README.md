![reactjs-vite-tailwindcss-boilerplate](https://user-images.githubusercontent.com/16243531/217138979-b854309c-4742-4275-a705-f9fec5158217.jpg)

# STEAM Reader

A React-based educational content platform with user authentication, article voting, and community feedback features.

> **New to this project?** See the comprehensive [SETUP-GUIDE.md](../SETUP-GUIDE.md) for complete installation, configuration, and deployment instructions.

## Tech Stack

This project is built with Vite, React 18, TypeScript, Vitest, Testing Library, TailwindCSS 3, Eslint and Prettier.

## Key Features

- **User Authentication** - Email/password auth with Supabase, email confirmation required
- **Article Voting** - Users can mark articles as read, verify tutorials, verify links, and endorse
- **Session Management** - Sessions stored in sessionStorage (cleared on browser close)
- **Password Security** - 13+ character passwords with complexity requirements and built-in generator

## What is inside?

This project uses many tools like:

- [Vite](https://vitejs.dev)
- [ReactJS](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Supabase](https://supabase.com) - Authentication & Database
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

Articles live in Supabase and are written in the CMS at `/admin` — there are no
markdown files in the repo and no build step for content. Saving in the editor
writes to the database; publishing makes the article live.

- `/admin/articles` — list, filter, search, and open the editor
- `/admin/articles/trash` — soft-deleted articles, restorable
- `/admin/courses` — group articles into an ordered, multi-part series

The editor has a **Visual** tab and a **Markdown** tab over the same content.
Article fields (category, tags, feature image, authors, excerpt, validation
badges) are set in the editor sidebar rather than in frontmatter.

**Scheduling:** the publish date defaults to the moment you publish. Setting it
in the future keeps the article hidden until then.

**Series:** ordering is handled by courses in `/admin/courses`, which also
generate the previous/next links on an article.

See [../CMS-SETUP.md](../CMS-SETUP.md) for schema, roles and editor internals.

## Categories and Tags

Both are managed at `/admin/taxonomy` — add, rename, edit or delete, with
article counts calculated automatically. Categories carry a `sort_order` that
controls the order shown in the footer and on the categories page.

### Category Colors

Colors are still hardcoded in [src/pages/Categories/index.tsx](src/pages/Categories/index.tsx):

```typescript
const categoryColors: Record<string, string> = {
  tutorial: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  science: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
}
```

Categories without a mapping use the default gray style. Note that the
`categories` table has a `color` column that `saveCategory` already writes and
`fetchCategories` already returns — but no admin screen sets it and the page
above does not read it. Wiring that up would remove this hardcoded map.

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
