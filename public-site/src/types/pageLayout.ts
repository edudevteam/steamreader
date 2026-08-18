/**
 * Pages as data.
 *
 * The front page used to be a fixed arrangement in `pages/Home`, and the
 * category and tag archives fixed arrangements in `pages/Category` and
 * `pages/Tag`. All three are now ordered lists of sections stored in
 * `site_settings`, which the Designer edits and each page renders top to
 * bottom.
 *
 * One section vocabulary covers all three surfaces. Most types make sense
 * anywhere -- a text block is a text block -- while `header` and `results`
 * need an archive to describe, so `SURFACE_SECTIONS` limits what the Designer
 * offers per surface and the renderer skips a section that has no context.
 *
 * Two rules keep the stored documents from becoming a liability:
 *
 *   * `DEFAULT_LAYOUTS` holds the layouts the site shipped with. They are what
 *     render when no row exists, so the designer starts from the real page
 *     rather than an empty canvas, and "reset" is a delete rather than a write.
 *   * `normalizePageLayout` is the only way stored JSON becomes a layout.
 *     Postgres holds these as unvalidated `jsonb`, so anything missing,
 *     misspelled or from an older version of the designer is repaired here
 *     rather than crashing a public page.
 */

/** The three pages the Designer can rearrange. */
export type PageSurface = 'home' | 'category' | 'tag'

export const SURFACE_LABELS: Record<PageSurface, string> = {
  home: 'Front page',
  category: 'Category pages',
  tag: 'Tag pages'
}

export const SURFACE_DESCRIPTIONS: Record<PageSurface, string> = {
  home: 'The home page, top to bottom.',
  category: 'Every /category/… page. One layout covers them all.',
  tag: 'Every /tag/… page. One layout covers them all.'
}

/** The `site_settings.key` each surface is stored under. */
export const SURFACE_KEYS: Record<PageSurface, string> = {
  home: 'home_layout',
  category: 'category_layout',
  tag: 'tag_layout'
}

/** Which articles an article section draws from. */
export type ArticleSourceMode = 'all' | 'tag' | 'not-tag' | 'category'

export interface ArticleSource {
  mode: ArticleSourceMode
  /** Tag or category slug. Ignored when the mode is `all`. */
  slug: string
}

export type PageSectionType =
  | 'header'
  | 'results'
  | 'search'
  | 'categories'
  | 'quote'
  | 'text'
  | 'articles'
  | 'groups'

interface BaseSection {
  /** Stable across reorders so React keys and the editor's selection hold. */
  id: string
  type: PageSectionType
  /** Kept in the layout but not rendered. Hiding beats deleting-and-rebuilding. */
  enabled: boolean
}

/**
 * The title block of an archive page: breadcrumb, name, description, count.
 * Renders nothing on the front page, which has no archive to name.
 */
export interface HeaderSection extends BaseSection {
  type: 'header'
  showBreadcrumb: boolean
  /** Category descriptions only. Tags carry none, so this is ignored there. */
  showDescription: boolean
  showCount: boolean
  align: 'left' | 'center'
}

/**
 * The archive's own articles -- the ones in this category or under this tag.
 * Unlike an `articles` section, its filter is the page itself.
 */
export interface ResultsSection extends BaseSection {
  type: 'results'
  style: 'grid' | 'list'
  /** Columns at the widest breakpoint. Narrower screens step down. */
  columns: number
  sort: 'newest' | 'oldest' | 'title'
  showExcerpt: boolean
  showCategory: boolean
  showAuthor: boolean
  showDate: boolean
  showReadingTime: boolean
  /** What the page says when the archive is empty. */
  emptyText: string
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

export type PageSection =
  | HeaderSection
  | ResultsSection
  | SearchSection
  | CategoriesSection
  | QuoteSection
  | TextSection
  | ArticlesSection
  | GroupsSection

export interface PageLayout {
  version: 1
  sections: PageSection[]
}

/** What the "Add section" menu offers, in the order it offers it. */
export const SECTION_LABELS: Record<PageSectionType, string> = {
  header: 'Page header',
  results: 'Article list',
  search: 'Search bar',
  categories: 'Category pills',
  articles: 'Articles',
  groups: 'Groups',
  quote: 'Random quote',
  text: 'Text block'
}

export const SECTION_DESCRIPTIONS: Record<PageSectionType, string> = {
  header: 'Breadcrumb, name, description and article count for this archive.',
  results: "The archive's own articles, as a grid or a list.",
  search: 'The rounded search field that sends readers to /search.',
  categories: 'One pill per article category, linking to its page.',
  articles: 'A carousel of articles, filtered by tag or category.',
  groups: 'A carousel of groups from one group category — Courses, say.',
  quote: 'One of the built-in quotes, picked at random on each visit.',
  text: 'A heading and a paragraph of your own words.'
}

/**
 * Which section types each surface may hold, in the order the Add menu lists
 * them. `header` and `results` describe an archive, so the front page has no
 * use for them; everything else travels.
 */
export const SURFACE_SECTIONS: Record<PageSurface, PageSectionType[]> = {
  home: ['articles', 'groups', 'quote', 'text', 'search', 'categories'],
  category: [
    'header',
    'results',
    'articles',
    'groups',
    'quote',
    'text',
    'search',
    'categories'
  ],
  tag: [
    'header',
    'results',
    'articles',
    'groups',
    'quote',
    'text',
    'search',
    'categories'
  ]
}

/** Sections that make no sense more than once on a page. */
export const SINGLETON_SECTIONS: PageSectionType[] = [
  'header',
  'results',
  'search',
  'categories'
]

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
export function createSection(type: PageSectionType): PageSection {
  const base = { id: newSectionId(), enabled: true }

  switch (type) {
    case 'header':
      return {
        ...base,
        type: 'header',
        showBreadcrumb: true,
        showDescription: true,
        showCount: true,
        align: 'left'
      }
    case 'results':
      return {
        ...base,
        type: 'results',
        style: 'grid',
        columns: 3,
        sort: 'newest',
        showExcerpt: true,
        showCategory: true,
        showAuthor: true,
        showDate: true,
        showReadingTime: true,
        emptyText: 'No articles here yet.'
      }
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
 * Each page exactly as it was before it became editable.
 *
 * Ids are fixed strings rather than generated so these constants are stable
 * across renders -- they are compared against a saved layout to decide whether
 * the designer has unsaved changes.
 */
export const DEFAULT_HOME_LAYOUT: PageLayout = {
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

/**
 * A category page: breadcrumb and name, its description, the count, then the
 * articles as a three-column grid. The cards carry no category pill -- every
 * article on the page is in the same category.
 */
export const DEFAULT_CATEGORY_LAYOUT: PageLayout = {
  version: 1,
  sections: [
    {
      id: 'default-category-header',
      type: 'header',
      enabled: true,
      showBreadcrumb: true,
      showDescription: true,
      showCount: true,
      align: 'left'
    },
    {
      id: 'default-category-results',
      type: 'results',
      enabled: true,
      style: 'grid',
      columns: 3,
      sort: 'newest',
      showExcerpt: true,
      showCategory: false,
      showAuthor: true,
      showDate: true,
      showReadingTime: true,
      emptyText: 'No articles in this category yet.'
    }
  ]
}

/**
 * A tag page. The same shape as a category page, except the cards do show a
 * category pill -- a tag spans categories, so it is worth saying which.
 */
export const DEFAULT_TAG_LAYOUT: PageLayout = {
  version: 1,
  sections: [
    {
      id: 'default-tag-header',
      type: 'header',
      enabled: true,
      showBreadcrumb: true,
      showDescription: false,
      showCount: true,
      align: 'left'
    },
    {
      id: 'default-tag-results',
      type: 'results',
      enabled: true,
      style: 'grid',
      columns: 3,
      sort: 'newest',
      showExcerpt: true,
      showCategory: true,
      showAuthor: true,
      showDate: true,
      showReadingTime: true,
      emptyText: 'No articles with this tag yet.'
    }
  ]
}

export const DEFAULT_LAYOUTS: Record<PageSurface, PageLayout> = {
  home: DEFAULT_HOME_LAYOUT,
  category: DEFAULT_CATEGORY_LAYOUT,
  tag: DEFAULT_TAG_LAYOUT
}

// ------------------------------------------------------------------ parsing

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
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
function toSection(value: unknown): PageSection | null {
  const raw = (value ?? {}) as Record<string, unknown>
  const type = raw.type as PageSectionType
  if (!(type in SECTION_LABELS)) return null

  const fallback = createSection(type) as unknown as Record<string, unknown>
  const base = {
    id: str(raw.id) || fallback.id,
    enabled: raw.enabled !== false
  }

  switch (type) {
    case 'header':
      return {
        ...base,
        type,
        showBreadcrumb: bool(raw.showBreadcrumb, true),
        showDescription: bool(raw.showDescription, true),
        showCount: bool(raw.showCount, true),
        align: raw.align === 'center' ? 'center' : 'left'
      } as HeaderSection
    case 'results':
      return {
        ...base,
        type,
        style: raw.style === 'list' ? 'list' : 'grid',
        columns: num(raw.columns, 3, 1, 4),
        sort:
          raw.sort === 'oldest' || raw.sort === 'title'
            ? (raw.sort as ResultsSection['sort'])
            : 'newest',
        showExcerpt: bool(raw.showExcerpt, true),
        showCategory: bool(raw.showCategory, true),
        showAuthor: bool(raw.showAuthor, true),
        showDate: bool(raw.showDate, true),
        showReadingTime: bool(raw.showReadingTime, true),
        emptyText: str(raw.emptyText, String(fallback.emptyText ?? ''))
      } as ResultsSection
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
 * Stored JSON into a layout, falling back to the surface's default when there
 * is nothing usable. An empty section list is legitimate -- someone may have
 * deliberately emptied the page -- so only a missing or malformed document
 * falls back.
 */
export function normalizePageLayout(
  value: unknown,
  surface: PageSurface
): PageLayout {
  const raw = value as { sections?: unknown } | null | undefined
  if (!raw || !Array.isArray(raw.sections)) return DEFAULT_LAYOUTS[surface]

  return {
    version: 1,
    sections: raw.sections
      .map(toSection)
      .filter((section): section is PageSection => section !== null)
  }
}
