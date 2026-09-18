/**
 * Everything the Studio UI can ask the local server to do.
 *
 * Each handler replaces what used to be a Supabase query in src/lib/cms, and
 * returns the same row shapes (types/cms.ts) the pages were written against,
 * so the pages themselves barely changed. The old database views -- the
 * byline aggregate, the category and tag counts -- are reproduced here.
 *
 * There are no roles or row-level policies any more. The Studio only listens
 * on localhost, so whoever can reach it is the site's owner.
 */
import { randomUUID } from 'node:crypto'
import slugify from 'slugify'
import {
  loadContent,
  removeArticle,
  writeArticle,
  writeCollection,
  writeLayouts,
  type Content,
  type StoredArticle,
  type StoredAuthor,
  type StoredCategory,
  type StoredGroup
} from './store'
import type {
  ArticleStatus,
  PageLayout,
  PageSurface,
  TagRef
} from '../../public-site/src/types'
import type {
  ArticleDetailRow,
  ArticleRow,
  ArticleTrashRow,
  CategoryRow,
  GroupCategoryRow,
  GroupDraft,
  GroupMembership,
  GroupRow,
  TagRow
} from '../src/types/cms'

const now = () => new Date().toISOString()
const toSlug = (text: string) => slugify(text, { lower: true, strict: true })

export class UserError extends Error {}

// ------------------------------------------------------------------ views

function articleRow(article: StoredArticle, content: Content): ArticleRow {
  const authors = article.author_ids
    .map((id) => content.authors.find((a) => a.id === id))
    .filter((a): a is StoredAuthor => Boolean(a))
  const primary = authors[0]
  const category = content.categories.find((c) => c.id === article.category_id)

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    status: article.status,
    published_at: article.published_at,
    updated_at: article.updated_at,
    created_at: article.created_at,
    reading_time: article.reading_time,
    feature_image: article.feature_image,
    validation: article.validation,
    previous_slug: article.previous_slug,
    next_slug: article.next_slug,
    author_id: primary?.id ?? null,
    author_slug: primary?.slug ?? null,
    author_name: primary?.name ?? null,
    authors: authors.map((a, i) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      is_primary: i === 0
    })),
    category_id: category?.id ?? null,
    category_slug: category?.slug ?? null,
    category_name: category?.name ?? null,
    tags: article.tag_ids
      .map((id) => content.tags.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => ({ slug: t!.slug, name: t!.name }))
  }
}

function findArticle(content: Content, id: string): StoredArticle {
  const article = content.articles.find((a) => a.id === id)
  if (!article) throw new UserError('That article no longer exists.')
  return article
}

function assertUniqueSlug(
  items: { id: string; slug: string }[],
  slug: string,
  id: string | undefined,
  what: string
) {
  if (!slug) throw new UserError(`The ${what} needs a slug.`)
  // Article slugs are also filenames, so nothing but a-z, 0-9 and dashes.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new UserError('Slugs may only contain a-z, 0-9 and dashes.')
  }
  if (items.some((item) => item.slug === slug && item.id !== id)) {
    throw new UserError(`That slug is already in use by another ${what}.`)
  }
}

/** Applies `patch` to each listed article and stamps it as updated. */
function patchArticles(
  ids: string[],
  patch: (article: StoredArticle) => Partial<StoredArticle>
) {
  const content = loadContent()
  for (const id of ids) {
    const article = content.articles.find((a) => a.id === id)
    if (article)
      writeArticle({ ...article, ...patch(article), updated_at: now() })
  }
}

function statusPatch(status: ArticleStatus) {
  return (article: StoredArticle): Partial<StoredArticle> => ({
    status,
    // Publishing without a date means now; a republish keeps its date.
    published_at:
      status === 'published'
        ? article.published_at ?? now()
        : article.published_at
  })
}

// ------------------------------------------------------------------ articles

export interface ArticlePayload {
  slug: string
  title: string
  subtitle: string | null
  excerpt: string
  content_markdown: string
  content_html: string
  toc: StoredArticle['toc']
  reading_time: number
  status: ArticleStatus
  published_at: string | null
  author_ids: string[]
  category_id: string | null
  tags: TagRef[]
  feature_image: StoredArticle['feature_image']
  previous_slug: string | null
  next_slug: string | null
  validation: StoredArticle['validation']
}

/** Tags are created on first use, the way the tag input always worked. */
function resolveTagIds(content: Content, tags: TagRef[]): string[] {
  let changed = false
  const ids = tags.map((ref) => {
    const slug = ref.slug || toSlug(ref.name)
    const existing = content.tags.find((t) => t.slug === slug)
    if (existing) return existing.id
    const created = { id: randomUUID(), slug, name: ref.name.trim() }
    content.tags.push(created)
    changed = true
    return created.id
  })
  if (changed) writeCollection('tags', content.tags)
  return [...new Set(ids)]
}

const articles = {
  listArticles(
    options: { status?: ArticleStatus | 'all'; search?: string } = {}
  ) {
    const content = loadContent()
    const search = options.search?.toLowerCase()
    return content.articles
      .filter((a) => !a.deleted_at)
      .filter(
        (a) =>
          !options.status ||
          options.status === 'all' ||
          a.status === options.status
      )
      .filter((a) => !search || a.title.toLowerCase().includes(search))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((a) => articleRow(a, content))
  },

  getArticle(id: string): ArticleDetailRow | null {
    const content = loadContent()
    const article = content.articles.find((a) => a.id === id)
    if (!article) return null
    return {
      ...articleRow(article, content),
      content_html: article.content_html,
      // Null for imported articles; the editor derives it from the HTML.
      content_markdown: article.content_markdown as string,
      toc: article.toc
    }
  },

  saveArticle({ id, payload }: { id?: string; payload: ArticlePayload }) {
    const content = loadContent()
    const slug = payload.slug.trim().toLowerCase()
    assertUniqueSlug(content.articles, slug, id, 'article')

    const existing = id ? findArticle(content, id) : undefined
    const { tags, ...fields } = payload

    const article: StoredArticle = {
      id: existing?.id ?? randomUUID(),
      created_at: existing?.created_at ?? now(),
      deleted_at: existing?.deleted_at ?? null,
      ...fields,
      slug,
      author_ids: [...new Set(payload.author_ids.filter(Boolean))],
      tag_ids: resolveTagIds(content, tags),
      updated_at: now()
    }

    writeArticle(article, existing?.slug)
    return { id: article.id, slug: article.slug }
  },

  trashArticles(ids: string[]) {
    patchArticles(ids, () => ({ deleted_at: now() }))
  },

  restoreArticle(id: string) {
    patchArticles([id], () => ({ deleted_at: null }))
  },

  /** The real delete, and only from the trash. */
  destroyArticle(id: string) {
    const content = loadContent()
    const article = findArticle(content, id)
    if (!article.deleted_at) {
      throw new UserError('Move the article to the trash before deleting it.')
    }
    removeArticle(article.slug)

    // Take it out of any group too, so no group points at a missing lesson.
    const groups = content.groups.map((g) => ({
      ...g,
      article_ids: g.article_ids.filter((a) => a !== id)
    }))
    writeCollection('groups', groups)
  },

  listTrashedArticles(): ArticleTrashRow[] {
    const content = loadContent()
    return content.articles
      .filter((a) => a.deleted_at)
      .sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!))
      .map((a) => {
        const row = articleRow(a, content)
        return {
          id: a.id,
          slug: a.slug,
          title: a.title,
          status: a.status,
          published_at: a.published_at,
          deleted_at: a.deleted_at!,
          deleted_by: null,
          deleted_by_name: null,
          author_id: row.author_id,
          author_name: row.author_name,
          category_name: row.category_name
        }
      })
  },

  setArticlesStatus({ ids, status }: { ids: string[]; status: ArticleStatus }) {
    patchArticles(ids, statusPatch(status))
  },

  setArticlesCategory({
    ids,
    categoryId
  }: {
    ids: string[]
    categoryId: string | null
  }) {
    patchArticles(ids, () => ({ category_id: categoryId }))
  },

  isSlugAvailable({ slug, excludeId }: { slug: string; excludeId?: string }) {
    return !loadContent().articles.some(
      (a) => a.slug === slug && a.id !== excludeId
    )
  },

  listAllTags(): TagRow[] {
    return [...loadContent().tags].sort((a, b) => a.name.localeCompare(b.name))
  }
}

// ------------------------------------------------------------------ groups

const groups = {
  listGroups(): GroupRow[] {
    const content = loadContent()
    return [...content.groups]
      .sort(
        (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
      )
      .map(({ article_ids, ...group }) => {
        const category = content.groupCategories.find(
          (c) => c.id === group.category_id
        )
        return {
          ...group,
          category: category
            ? { slug: category.slug, name: category.name }
            : null,
          lesson_count: article_ids.length
        }
      })
  },

  listGroupMemberships(): GroupMembership[] {
    return groups.listGroups().map((g) => ({
      id: g.id,
      title: g.title,
      article_ids: loadContent().groups.find((s) => s.id === g.id)!.article_ids
    }))
  },

  getGroup(id: string): GroupDraft | null {
    const content = loadContent()
    const group = content.groups.find((g) => g.id === id)
    if (!group) return null
    return {
      id: group.id,
      slug: group.slug,
      title: group.title,
      description: group.description,
      feature_image: group.feature_image?.src
        ? group.feature_image
        : { src: '', alt: '' },
      category_id: group.category_id,
      sort_order: group.sort_order,
      lessons: group.article_ids.flatMap((articleId) => {
        const a = content.articles.find((x) => x.id === articleId)
        return a
          ? [
              {
                article_id: a.id,
                slug: a.slug,
                title: a.title,
                status: a.status,
                trashed: Boolean(a.deleted_at)
              }
            ]
          : []
      })
    }
  },

  saveGroup(draft: GroupDraft): string {
    const content = loadContent()
    const title = draft.title.trim() || 'Untitled group'
    const slug = (draft.slug.trim() || toSlug(title)).toLowerCase()
    assertUniqueSlug(content.groups, slug, draft.id, 'group')

    const existing = content.groups.find((g) => g.id === draft.id)
    const group: StoredGroup = {
      id: existing?.id ?? randomUUID(),
      created_at: existing?.created_at ?? now(),
      slug,
      title,
      description: draft.description.trim(),
      feature_image: draft.feature_image,
      category_id: draft.category_id,
      sort_order: draft.sort_order,
      article_ids: draft.lessons.map((l) => l.article_id)
    }

    writeCollection(
      'groups',
      existing
        ? content.groups.map((g) => (g.id === group.id ? group : g))
        : [...content.groups, group]
    )
    return group.id
  },

  deleteGroup(id: string) {
    writeCollection(
      'groups',
      loadContent().groups.filter((g) => g.id !== id)
    )
  },

  isGroupSlugAvailable({
    slug,
    excludeId
  }: {
    slug: string
    excludeId?: string
  }) {
    return !loadContent().groups.some(
      (g) => g.slug === slug && g.id !== excludeId
    )
  }
}

// ------------------------------------------------------------------ taxonomy

type CategoryInput = Partial<StoredCategory> & { name: string }

function saveCategoryLike(
  key: 'categories' | 'groupCategories',
  input: CategoryInput,
  what: string
) {
  const list = loadContent()[key]
  const slug = input.slug || toSlug(input.name)
  assertUniqueSlug(list, slug, input.id, what)

  const record: StoredCategory = {
    id: input.id ?? randomUUID(),
    slug,
    name: input.name.trim(),
    description: input.description || null,
    color: input.color || null,
    sort_order: input.sort_order ?? 0
  }
  writeCollection(
    key,
    input.id
      ? list.map((c) => (c.id === input.id ? record : c))
      : [...list, record]
  )
}

const bySortThenName = (a: StoredCategory, b: StoredCategory) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name)

const taxonomy = {
  listCategories(): CategoryRow[] {
    const content = loadContent()
    return [...content.categories].sort(bySortThenName).map((c) => ({
      ...c,
      article_count: content.articles.filter(
        (a) => !a.deleted_at && a.category_id === c.id
      ).length
    }))
  },

  saveCategory(input: CategoryInput) {
    saveCategoryLike('categories', input, 'category')
  },

  /** Articles in it become uncategorised; nothing else is deleted. */
  deleteCategory(id: string) {
    const content = loadContent()
    writeCollection(
      'categories',
      content.categories.filter((c) => c.id !== id)
    )
    content.articles
      .filter((a) => a.category_id === id)
      .forEach((a) => writeArticle({ ...a, category_id: null }))
  },

  listTags(): TagRow[] {
    const content = loadContent()
    return [...content.tags]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        ...t,
        article_count: content.articles.filter(
          (a) => !a.deleted_at && a.tag_ids.includes(t.id)
        ).length
      }))
  },

  saveTag(input: Partial<TagRow> & { name: string }) {
    const tags = loadContent().tags
    const slug = input.slug || toSlug(input.name)
    assertUniqueSlug(tags, slug, input.id, 'tag')
    const record = {
      id: input.id ?? randomUUID(),
      slug,
      name: input.name.trim()
    }
    writeCollection(
      'tags',
      input.id
        ? tags.map((t) => (t.id === input.id ? record : t))
        : [...tags, record]
    )
  },

  deleteTag(id: string) {
    const content = loadContent()
    writeCollection(
      'tags',
      content.tags.filter((t) => t.id !== id)
    )
    content.articles
      .filter((a) => a.tag_ids.includes(id))
      .forEach((a) =>
        writeArticle({ ...a, tag_ids: a.tag_ids.filter((t) => t !== id) })
      )
  },

  listGroupCategories(): GroupCategoryRow[] {
    const content = loadContent()
    return [...content.groupCategories].sort(bySortThenName).map((c) => ({
      ...c,
      group_count: content.groups.filter((g) => g.category_id === c.id).length
    }))
  },

  saveGroupCategory(input: CategoryInput) {
    saveCategoryLike('groupCategories', input, 'group category')
  },

  /** Groups in it become uncategorised rather than being deleted. */
  deleteGroupCategory(id: string) {
    const content = loadContent()
    writeCollection(
      'groupCategories',
      content.groupCategories.filter((c) => c.id !== id)
    )
    writeCollection(
      'groups',
      content.groups.map((g) =>
        g.category_id === id ? { ...g, category_id: null } : g
      )
    )
  }
}

// ------------------------------------------------------------------ layouts

const layouts = {
  getPageLayout(surface: PageSurface) {
    const stored = loadContent().layouts[surface]
    return { stored: stored ?? null }
  },

  /** `savedAt` rides along in the layout; the public site ignores it. */
  savePageLayout({
    surface,
    layout
  }: {
    surface: PageSurface
    layout: PageLayout
  }) {
    writeLayouts({
      ...loadContent().layouts,
      [surface]: { ...layout, savedAt: now() }
    })
  },

  /** Back to the built-in default: the entry is removed, not overwritten. */
  resetPageLayout(surface: PageSurface) {
    const next = { ...loadContent().layouts }
    delete next[surface]
    writeLayouts(next)
  }
}

// ------------------------------------------------------------------ authors

export interface AuthorRow extends StoredAuthor {
  article_count: number
}

const authors = {
  listAuthors(): AuthorRow[] {
    const content = loadContent()
    return [...content.authors]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({
        ...a,
        article_count: content.articles.filter(
          (x) => !x.deleted_at && x.author_ids.includes(a.id)
        ).length
      }))
  },

  saveAuthor(input: Partial<StoredAuthor> & { name: string }): string {
    const list = loadContent().authors
    const slug = input.slug || toSlug(input.name)
    assertUniqueSlug(list, slug, input.id, 'author')

    const record: StoredAuthor = {
      id: input.id ?? randomUUID(),
      slug,
      name: input.name.trim(),
      bio: input.bio || null,
      avatar_url: input.avatar_url || null,
      social:
        input.social && Object.values(input.social).some(Boolean)
          ? input.social
          : null
    }
    writeCollection(
      'authors',
      input.id
        ? list.map((a) => (a.id === input.id ? record : a))
        : [...list, record]
    )
    return record.id
  },

  /**
   * Removes an author from every byline. With `reassignTo`, their articles
   * are credited to that author instead of losing the credit.
   */
  deleteAuthor({ id, reassignTo }: { id: string; reassignTo?: string }) {
    const content = loadContent()
    writeCollection(
      'authors',
      content.authors.filter((a) => a.id !== id)
    )
    content.articles
      .filter((a) => a.author_ids.includes(id))
      .forEach((a) => {
        const ids = a.author_ids.flatMap((x) =>
          x === id ? (reassignTo ? [reassignTo] : []) : [x]
        )
        writeArticle({ ...a, author_ids: [...new Set(ids)] })
      })
  }
}

export const handlers: Record<string, (args: never) => unknown> = {
  ...articles,
  ...groups,
  ...taxonomy,
  ...layouts,
  ...authors
}
