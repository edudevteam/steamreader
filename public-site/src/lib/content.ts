/**
 * Public content reads.
 *
 * Everything the site shows is static JSON that the Studio publishes to the
 * R2 bucket under `data/`:
 *
 *   data/articles/index.json   every published article, newest first
 *   data/articles/<slug>.json  one article with its body
 *   data/site.json             categories, tags, authors, groups, page layouts
 *
 * There is no database and no login behind any of it, so nothing a visitor
 * does can write to it. Drafts never leave the Studio's machine, so there is
 * nothing unpublished here to filter out either.
 *
 * `VITE_CONTENT_BASE_URL` points somewhere else in development or in the
 * Studio's preview; the default is the public bucket.
 */
import { DEFAULT_LAYOUTS, normalizePageLayout } from 'types'
import type {
  Article,
  ArticleMeta,
  ArticlesIndex,
  Author,
  Category,
  GroupMeta,
  PageLayout,
  PageSurface,
  Tag
} from 'types'

export const CONTENT_BASE_URL = (
  import.meta.env.VITE_CONTENT_BASE_URL ?? 'https://cdn.steamreader.com/data'
).replace(/\/$/, '')

/** The shape of `data/site.json`. */
export interface SiteData {
  categories: (Category & { articleCount: number })[]
  tags: Tag[]
  authors: Author[]
  groups: GroupMeta[]
  /** Only the surfaces the Designer has changed; the rest use the defaults. */
  layouts: Partial<Record<PageSurface, unknown>>
}

class NotFoundError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  // `no-cache` revalidates rather than skipping the cache: an unchanged file
  // costs a 304, and a fresh publish shows up on the next navigation instead
  // of whenever the browser's heuristic expiry runs out.
  const response = await fetch(`${CONTENT_BASE_URL}/${path}`, {
    cache: 'no-cache'
  })
  if (response.status === 404) throw new NotFoundError(path)
  if (!response.ok)
    throw new Error(`Failed to load content (${response.status})`)
  return (await response.json()) as T
}

let site: Promise<SiteData> | null = null

/** One request for all the small collections, shared by every hook below. */
function fetchSite(): Promise<SiteData> {
  site ??= getJson<SiteData>('site.json').catch((error) => {
    site = null
    throw error
  })
  return site
}

/** Forgets the shared site document, so the next read fetches it again. */
export function resetSiteData(): void {
  site = null
}

export async function fetchArticles(): Promise<ArticleMeta[]> {
  const index = await getJson<ArticlesIndex>('articles/index.json')
  return index.articles
}

export async function fetchArticleBySlug(
  slug: string
): Promise<Article | null> {
  try {
    return await getJson<Article>(`articles/${encodeURIComponent(slug)}.json`)
  } catch (error) {
    if (error instanceof NotFoundError) return null
    throw error
  }
}

export async function fetchCategories(): Promise<
  (Category & { articleCount: number })[]
> {
  return (await fetchSite()).categories
}

export async function fetchTags(): Promise<Tag[]> {
  return (await fetchSite()).tags
}

export async function fetchAuthors(): Promise<Author[]> {
  return (await fetchSite()).authors
}

export async function fetchGroups(): Promise<GroupMeta[]> {
  return (await fetchSite()).groups
}

/**
 * One page's layout, as saved by the Designer. A surface nobody has changed
 * is simply absent, and so is one the site cannot load -- either way the page
 * renders its built-in default rather than nothing.
 */
export async function fetchPageLayout(
  surface: PageSurface
): Promise<PageLayout> {
  try {
    const stored = (await fetchSite()).layouts?.[surface]
    return stored
      ? normalizePageLayout(stored, surface)
      : DEFAULT_LAYOUTS[surface]
  } catch {
    return DEFAULT_LAYOUTS[surface]
  }
}
