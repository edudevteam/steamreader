/**
 * The home page as data.
 *
 * The front page used to be a fixed arrangement in `pages/Home`. It is now an
 * ordered list of sections stored in `site_settings.home_layout`, which the
 * Front Page Designer edits and the home page renders top to bottom.
 *
 * Two rules keep the stored document from becoming a liability:
 *
 *   * `DEFAULT_HOME_LAYOUT` is the layout the site shipped with. It is what
 *     renders when no row exists, so the designer starts from the real page
 *     rather than an empty canvas, and "reset" is a delete rather than a write.
 *   * `normalizeHomeLayout` is the only way stored JSON becomes a layout.
 *     Postgres holds this as an unvalidated `jsonb`, so anything missing,
 *     misspelled or from an older version of the designer is repaired here
 *     rather than crashing the front page.
 */

/** Which articles an article section draws from. */
export type ArticleSourceMode = 'all' | 'tag' | 'not-tag' | 'category'

export interface ArticleSource {
  mode: ArticleSourceMode
  /** Tag or category slug. Ignored when the mode is `all`. */
  slug: string
}

export type HomeSectionType =
  | 'search'
  | 'categories'
  | 'quote'
  | 'text'
  | 'articles'
  | 'groups'

interface BaseSection {
  /** Stable across reorders so React keys and the editor's selection hold. */
  id: string
  type: HomeSectionType
  /** Kept in the layout but not rendered. Hiding beats deleting-and-rebuilding. */
  enabled: boolean
}

export interface SearchSection extends BaseSection {
  type: 'search'
  placeholder: string
}

export interface CategoriesSection extends BaseSection {
  type: 'categories'
}

export interface QuoteSection extends BaseSection {
  type: 'quote'
}

export interface TextSection extends BaseSection {
  type: 'text'
  title: string
  body: string
  align: 'left' | 'center'
}

export interface ArticlesSection extends BaseSection {
  type: 'articles'
  title: string
  subtitle: string
  source: ArticleSource
  /** How many cards the section holds in total. */
  limit: number
  /** Cards per page in the carousel. */
  perPage: number
  variant: 'default' | 'tutorial'
  viewAllLink: string
  viewAllText: string
}

export interface GroupsSection extends BaseSection {
  type: 'groups'
  title: string
  subtitle: string
  /** Group category to draw from. `null` means every group. */
  categorySlug: string | null
  /** Singular word each card wears. Empty falls back to the category name. */
  badge: string
  limit: number
  perPage: number
}

export type HomeSection =
  | SearchSection
  | CategoriesSection
  | QuoteSection
  | TextSection
  | ArticlesSection
  | GroupsSection

export interface HomeLayout {
  version: 1
  sections: HomeSection[]
}

/** What the "Add section" menu offers, in the order it offers it. */
export const SECTION_LABELS: Record<HomeSectionType, string> = {
  search: 'Search bar',
  categories: 'Category pills',
  articles: 'Articles',
  groups: 'Groups',
  quote: 'Random quote',
  text: 'Text block'
}

export const SECTION_DESCRIPTIONS: Record<HomeSectionType, string> = {
  search: 'The rounded search field that sends readers to /search.',
  categories: 'One pill per article category, linking to its page.',
  articles: 'A carousel of articles, filtered by tag or category.',
  groups: 'A carousel of groups from one group category — Courses, say.',
  quote: 'One of the built-in quotes, picked at random on each visit.',
  text: 'A heading and a paragraph of your own words.'
}

/** Sections that make no sense more than once on a page. */
export const SINGLETON_SECTIONS: HomeSectionType[] = ['search', 'categories']

/**
 * Ids are generated rather than derived from position so a reorder does not
 * renumber everything. `crypto.randomUUID` is unavailable over plain HTTP on
 * some browsers, hence the fallback.
 */
export function newSectionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `s-${Math.random().toString(36).slice(2, 10)}`
}

/** A section of the given type, filled in with sensible starting copy. */
export function createSection(type: HomeSectionType): HomeSection {
  const base = { id: newSectionId(), enabled: true }

  switch (type) {
    case 'search':
      return {
        ...base,
        type: 'search',
        placeholder: 'Search articles by title, author, category, or tags...'
      }
    case 'categories':
      return { ...base, type: 'categories' }
    case 'quote':
      return { ...base, type: 'quote' }
    case 'text':
      return {
        ...base,
        type: 'text',
        title: 'New section',
        body: '',
        align: 'center'
      }
    case 'articles':
      return {
        ...base,
        type: 'articles',
        title: 'New article section',
        subtitle: '',
        source: { mode: 'all', slug: '' },
        limit: 3,
        perPage: 3,
        variant: 'default',
        viewAllLink: '/latest',
        viewAllText: 'View all articles'
      }
    case 'groups':
      return {
        ...base,
        type: 'groups',
        title: 'New group section',
        subtitle: '',
        categorySlug: null,
        badge: '',
        limit: 3,
        perPage: 3
      }
  }
}

/**
 * The front page exactly as it was before it became editable.
 *
 * Ids are fixed strings rather than generated so this constant is stable
 * across renders -- it is compared against a saved layout to decide whether
 * the designer has unsaved changes.
 */
export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  version: 1,
  sections: [
    {
      id: 'default-search',
      type: 'search',
      enabled: true,
      placeholder: 'Search articles by title, author, category, or tags...'
    },
    { id: 'default-categories', type: 'categories', enabled: true },
    {
      id: 'default-courses',
      type: 'groups',
      enabled: true,
      title: 'Courses',
      subtitle: 'Structured learning paths to build your skills',
      categorySlug: 'courses',
      badge: 'Course',
      limit: 3,
      perPage: 3
    },
    { id: 'default-quote', type: 'quote', enabled: true },
    {
      id: 'default-tutorials',
      type: 'articles',
      enabled: true,
      title: 'The Learning Lab',
      subtitle: 'Step-by-step guides to master new skills',
      source: { mode: 'tag', slug: 'tutorial' },
      limit: 3,
      perPage: 3,
      variant: 'tutorial',
      viewAllLink: '/tag/tutorial',
      viewAllText: 'View all tutorials'
    },
    {
      id: 'default-stories',
      type: 'articles',
      enabled: true,
      title: 'Stories & Discoveries',
      subtitle:
        'Fresh reads from across science, technology, engineering, arts, and math',
      source: { mode: 'not-tag', slug: 'tutorial' },
      limit: 3,
      perPage: 3,
      variant: 'default',
      viewAllLink: '/latest',
      viewAllText: 'View all articles'
    }
  ]
}

// ------------------------------------------------------------------ parsing

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function toSource(value: unknown): ArticleSource {
  const raw = (value ?? {}) as Record<string, unknown>
  const mode = raw.mode
  const valid: ArticleSourceMode[] = ['all', 'tag', 'not-tag', 'category']
  return {
    mode: valid.includes(mode as ArticleSourceMode)
      ? (mode as ArticleSourceMode)
      : 'all',
    slug: str(raw.slug)
  }
}

/**
 * One stored object into a section, or null if it is not one.
 *
 * Every field falls back to what `createSection` would have used, so a layout
 * saved by an older designer picks up new fields at their defaults instead of
 * rendering with `undefined`.
 */
function toSection(value: unknown): HomeSection | null {
  const raw = (value ?? {}) as Record<string, unknown>
  const type = raw.type as HomeSectionType
  if (!(type in SECTION_LABELS)) return null

  const fallback = createSection(type) as unknown as Record<string, unknown>
  const base = {
    id: str(raw.id) || fallback.id,
    enabled: raw.enabled !== false
  }

  switch (type) {
    case 'search':
      return {
        ...base,
        type,
        placeholder: str(raw.placeholder, String(fallback.placeholder ?? ''))
      } as SearchSection
    case 'categories':
    case 'quote':
      return { ...base, type } as CategoriesSection | QuoteSection
    case 'text':
      return {
        ...base,
        type,
        title: str(raw.title),
        body: str(raw.body),
        align: raw.align === 'left' ? 'left' : 'center'
      } as TextSection
    case 'articles':
      return {
        ...base,
        type,
        title: str(raw.title),
        subtitle: str(raw.subtitle),
        source: toSource(raw.source),
        limit: num(raw.limit, 3, 1, 48),
        perPage: num(raw.perPage, 3, 1, 6),
        variant: raw.variant === 'tutorial' ? 'tutorial' : 'default',
        viewAllLink: str(raw.viewAllLink),
        viewAllText: str(raw.viewAllText, 'View all')
      } as ArticlesSection
    case 'groups':
      return {
        ...base,
        type,
        title: str(raw.title),
        subtitle: str(raw.subtitle),
        categorySlug:
          typeof raw.categorySlug === 'string' && raw.categorySlug
            ? raw.categorySlug
            : null,
        badge: str(raw.badge),
        limit: num(raw.limit, 3, 1, 48),
        perPage: num(raw.perPage, 3, 1, 6)
      } as GroupsSection
  }
}

/**
 * Stored JSON into a layout, falling back to the default when there is
 * nothing usable. An empty section list is legitimate -- someone may have
 * deliberately emptied the page -- so only a missing or malformed document
 * falls back.
 */
export function normalizeHomeLayout(value: unknown): HomeLayout {
  const raw = value as { sections?: unknown } | null | undefined
  if (!raw || !Array.isArray(raw.sections)) return DEFAULT_HOME_LAYOUT

  return {
    version: 1,
    sections: raw.sections
      .map(toSection)
      .filter((section): section is HomeSection => section !== null)
  }
}
