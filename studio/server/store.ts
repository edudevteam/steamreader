/**
 * The Studio's content store: plain JSON files under studio/content.
 *
 *   articles/<slug>.json    one file per article, drafts and trash included
 *   authors.json            bylines (people are content now, not accounts)
 *   categories.json         article categories
 *   tags.json
 *   group-categories.json
 *   groups.json             groups with their lessons, as article ids in order
 *   layouts.json            Designer layouts, keyed by surface
 *
 * The folder is committed to git, which makes it the backup and the history.
 * Everything is read fresh on every request -- there are a few dozen small
 * files, and it means a `git checkout` or a hand edit shows up without a
 * restart.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  FeatureImage,
  TocItem,
  ValidationBadges
} from '../../public-site/src/types'
import type { ArticleStatus } from '../../public-site/src/types/article'

export const CONTENT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'content'
)
const ARTICLES_DIR = join(CONTENT_DIR, 'articles')

export interface StoredArticle {
  id: string
  slug: string
  title: string
  subtitle: string | null
  excerpt: string
  status: ArticleStatus
  published_at: string | null
  created_at: string
  updated_at: string
  /** Set while the article is in the trash. */
  deleted_at: string | null
  /** Byline in order; the first entry is the primary author. */
  author_ids: string[]
  category_id: string | null
  tag_ids: string[]
  feature_image: FeatureImage
  validation: ValidationBadges | null
  previous_slug: string | null
  next_slug: string | null
  /** Null for articles imported as HTML and not yet opened in the editor. */
  content_markdown: string | null
  content_html: string
  toc: TocItem[]
  reading_time: number
}

export interface StoredAuthor {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar_url: string | null
  social: Record<string, string> | null
}

export interface StoredCategory {
  id: string
  slug: string
  name: string
  description: string | null
  color: string | null
  sort_order: number
}

export interface StoredTag {
  id: string
  slug: string
  name: string
}

export interface StoredGroup {
  id: string
  slug: string
  title: string
  description: string
  feature_image: FeatureImage
  category_id: string | null
  sort_order: number
  created_at: string
  article_ids: string[]
}

export type StoredLayouts = Partial<
  Record<'home' | 'category' | 'tag', unknown>
>

export interface Collections {
  authors: StoredAuthor[]
  categories: StoredCategory[]
  tags: StoredTag[]
  groupCategories: StoredCategory[]
  groups: StoredGroup[]
}

export interface Content extends Collections {
  articles: StoredArticle[]
  layouts: StoredLayouts
}

const COLLECTION_FILES: Record<keyof Collections, string> = {
  authors: 'authors.json',
  categories: 'categories.json',
  tags: 'tags.json',
  groupCategories: 'group-categories.json',
  groups: 'groups.json'
}

function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

/** Write-then-rename, so a crash mid-save never leaves half a file behind. */
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.tmp`
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n')
  renameSync(temp, file)
}

export function loadContent(): Content {
  const articles = existsSync(ARTICLES_DIR)
    ? readdirSync(ARTICLES_DIR)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readJson<StoredArticle>(join(ARTICLES_DIR, name), null!))
    : []

  const collections = Object.fromEntries(
    Object.entries(COLLECTION_FILES).map(([key, file]) => [
      key,
      readJson(join(CONTENT_DIR, file), [])
    ])
  ) as unknown as Collections

  return {
    ...collections,
    articles,
    layouts: readJson<StoredLayouts>(join(CONTENT_DIR, 'layouts.json'), {})
  }
}

const articleFile = (slug: string) => join(ARTICLES_DIR, `${slug}.json`)

/**
 * Files are named by slug so the folder reads like the site. A slug change
 * therefore renames the file -- `previousSlug` is the name it had.
 */
export function writeArticle(
  article: StoredArticle,
  previousSlug?: string
): void {
  writeJson(articleFile(article.slug), article)
  if (previousSlug && previousSlug !== article.slug) {
    rmSync(articleFile(previousSlug), { force: true })
  }
}

export function removeArticle(slug: string): void {
  rmSync(articleFile(slug), { force: true })
}

export function writeCollection<K extends keyof Collections>(
  key: K,
  value: Collections[K]
): void {
  writeJson(join(CONTENT_DIR, COLLECTION_FILES[key]), value)
}

export function writeLayouts(layouts: StoredLayouts): void {
  writeJson(join(CONTENT_DIR, 'layouts.json'), layouts)
}

/** Record of what was last uploaded, so a publish only sends what changed. */
const MANIFEST = join(CONTENT_DIR, 'published.json')

export interface PublishManifest {
  publishedAt: string | null
  /** R2 key -> sha256 of the body uploaded under it. */
  files: Record<string, string>
}

export function readManifest(): PublishManifest {
  return readJson<PublishManifest>(MANIFEST, { publishedAt: null, files: {} })
}

export function writeManifest(manifest: PublishManifest): void {
  writeJson(MANIFEST, manifest)
}
