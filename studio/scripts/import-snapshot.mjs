/**
 * One-off: turns the JSON snapshot in public-site/src/data into the Studio's
 * content store (studio/content).
 *
 * The snapshot is what the public site shipped before Supabase, so it carries
 * rendered HTML but no markdown source. `content_html` is copied verbatim --
 * published pages stay byte-identical -- and `content_markdown` is left null.
 * The editor derives markdown from the HTML the first time an article is
 * opened, and the next save renders fresh HTML from it.
 *
 *   node scripts/import-snapshot.mjs            # refuses if content/ exists
 *   node scripts/import-snapshot.mjs --force    # overwrite
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '..', 'public-site', 'src', 'data')
const target = join(root, 'content')

if (existsSync(target) && !process.argv.includes('--force')) {
  console.error(`${target} already exists. Pass --force to overwrite it.`)
  process.exit(1)
}

const read = (file) => JSON.parse(readFileSync(join(source, file), 'utf8'))
const write = (file, value) =>
  writeFileSync(join(target, file), JSON.stringify(value, null, 2) + '\n')

rmSync(target, { recursive: true, force: true })
mkdirSync(join(target, 'articles'), { recursive: true })

const now = new Date().toISOString()
const titleCase = (slug) =>
  slug.replace(/(^|-)(\w)/g, (_, dash, c) => (dash ? ' ' : '') + c.toUpperCase())

// ------------------------------------------------------------------ taxonomy

const authors = new Map()
const categories = new Map()
const tags = new Map()

function author(ref) {
  if (!authors.has(ref.slug)) {
    authors.set(ref.slug, {
      id: randomUUID(),
      slug: ref.slug,
      name: ref.name || titleCase(ref.slug),
      bio: null,
      avatar_url: null,
      social: null
    })
  }
  return authors.get(ref.slug).id
}

function category(ref, sortOrder = categories.size) {
  if (!categories.has(ref.slug)) {
    categories.set(ref.slug, {
      id: randomUUID(),
      slug: ref.slug,
      name: ref.name,
      description: ref.description ?? null,
      color: ref.color ?? null,
      sort_order: sortOrder
    })
  }
  return categories.get(ref.slug).id
}

function tag(ref) {
  if (!tags.has(ref.slug)) {
    tags.set(ref.slug, { id: randomUUID(), slug: ref.slug, name: ref.name })
  }
  return tags.get(ref.slug).id
}

read('authors.json').authors.forEach(author)
read('categories.json').categories.forEach((c, i) => category(c, i))
read('tags.json').tags.forEach(tag)

// ------------------------------------------------------------------ articles

// The index lists what was live. Article files missing from it come in as
// drafts, so nothing goes public that was not public before.
const listed = new Set(read('articles.json').articles.map((a) => a.slug))
const articleIds = new Map()
const drafted = []

for (const file of readdirSync(join(source, 'articles')).sort()) {
  const a = read(join('articles', file))
  const published = listed.has(a.slug)
  if (!published) drafted.push(a.slug)

  const id = a.id ?? randomUUID()
  articleIds.set(a.slug, id)

  write(join('articles', `${a.slug}.json`), {
    id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle ?? null,
    excerpt: a.excerpt ?? '',
    status: published ? 'published' : 'draft',
    published_at: a.publishedAt ?? null,
    created_at: a.publishedAt ?? now,
    updated_at: a.updatedAt ?? a.publishedAt ?? now,
    deleted_at: null,
    author_ids: (a.authors ?? [a.author]).filter(Boolean).map(author),
    category_id: a.category ? category(a.category) : null,
    tag_ids: (a.tags ?? []).map(tag),
    feature_image: a.featureImage ?? { src: '', alt: '' },
    validation: a.validation ?? null,
    previous_slug: a.previousArticle?.slug ?? null,
    next_slug: a.nextArticle?.slug ?? null,
    content_markdown: null,
    content_html: a.content ?? '',
    toc: a.tableOfContents ?? [],
    reading_time: a.readingTime ?? 1
  })
}

// ------------------------------------------------------------------ groups

const courses = {
  id: randomUUID(),
  slug: 'courses',
  name: 'Courses',
  description: null,
  color: null,
  sort_order: 0
}

const groups = read('courses.json').courses.map((c, index) => ({
  id: randomUUID(),
  slug: c.slug,
  title: c.title,
  description: c.description ?? '',
  feature_image: c.featureImage ?? { src: '', alt: '' },
  category_id: courses.id,
  sort_order: index,
  created_at: now,
  article_ids: c.articles.map((slug) => articleIds.get(slug)).filter(Boolean)
}))

write('authors.json', [...authors.values()])
write('categories.json', [...categories.values()])
write('tags.json', [...tags.values()])
write('group-categories.json', [courses])
write('groups.json', groups)
write('layouts.json', {})

console.log(
  `Imported ${articleIds.size} articles, ${authors.size} authors, ` +
    `${categories.size} categories, ${tags.size} tags, ${groups.length} groups.`
)
if (drafted.length) console.log(`Not in the index, imported as drafts: ${drafted.join(', ')}`)
