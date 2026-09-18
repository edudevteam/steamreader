/**
 * Article reads and writes, against studio/content through the local server.
 *
 * Markdown is rendered here in the browser on save, as it always was, so the
 * stored HTML comes out of the same pipeline the editor previews with.
 */
import { mutate, rpc } from './api'
import {
  generateSlug,
  htmlToMarkdown,
  renderArticleContent,
  generateExcerpt
} from 'lib/markdown'
import type {
  ArticleDraft,
  ArticleDetailRow,
  ArticleRow,
  ArticleStatus,
  ArticleTrashRow,
  TagRow
} from 'types'

export interface ListOptions {
  mine?: boolean
  authorId?: string
  status?: ArticleStatus | 'all'
  search?: string
}

export async function listArticles(
  options: ListOptions = {}
): Promise<ArticleRow[]> {
  const rows = await rpc<ArticleRow[]>('listArticles', {
    status: options.status,
    search: options.search
  })

  // "Mine" covers co-authored work too, so it matches anywhere in the byline.
  if (options.mine && options.authorId) {
    const id = options.authorId
    return rows.filter((row) =>
      (row.authors ?? []).some((person) => person.id === id)
    )
  }

  return rows
}

/**
 * Articles imported from the old site arrive as HTML only. Their markdown is
 * recovered from it here, the first time one is opened, by the same converter
 * the visual editor saves through. The lead paragraph the renderer injected
 * above "Lesson Objectives" is taken back out, or the next save would add it
 * a second time.
 */
function recoverMarkdown(row: ArticleDetailRow): string {
  const template = document.createElement('template')
  template.innerHTML = row.content_html

  const objectives = [...template.content.querySelectorAll('h2')].find((h) =>
    /Lesson Objectives/.test(h.textContent ?? '')
  )
  const lead = objectives?.previousElementSibling
  if (
    lead?.tagName === 'P' &&
    lead.textContent?.trim() === row.excerpt.trim()
  ) {
    lead.remove()
  }

  return htmlToMarkdown(template.innerHTML)
}

export async function getArticle(id: string): Promise<ArticleDetailRow | null> {
  const row = await rpc<ArticleDetailRow | null>('getArticle', id)
  if (row && row.content_markdown == null) {
    row.content_markdown = recoverMarkdown(row)
  }
  return row
}

export function rowToDraft(row: ArticleDetailRow): ArticleDraft {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? '',
    excerpt: row.excerpt,
    content_markdown: row.content_markdown,
    status: row.status,
    published_at: row.published_at,
    author_id: row.author_id,
    co_author_ids: (row.authors ?? [])
      .filter((person) => !person.is_primary)
      .map((person) => person.id),
    category_id: row.category_id,
    tags: row.tags ?? [],
    feature_image: (row.feature_image as ArticleDraft['feature_image']) ?? {
      src: '',
      alt: ''
    },
    previous_slug: row.previous_slug,
    next_slug: row.next_slug,
    validation: row.validation
  }
}

export interface SaveResult {
  id: string
  slug: string
}

/**
 * Persists a draft. Markdown is the source of truth; the HTML, table of
 * contents and reading time are derived here so readers never pay for a
 * markdown parse and the stored HTML matches the build pipeline exactly.
 */
export async function saveArticle(draft: ArticleDraft): Promise<SaveResult> {
  const title = draft.title.trim() || 'Untitled'
  const slug = (draft.slug.trim() || generateSlug(title)).toLowerCase()
  const excerpt =
    draft.excerpt.trim() || generateExcerpt(draft.content_markdown)

  const rendered = renderArticleContent(draft.content_markdown, excerpt)

  return mutate<SaveResult>('saveArticle', {
    id: draft.id,
    payload: {
      slug,
      title,
      subtitle: draft.subtitle.trim() || null,
      excerpt,
      content_markdown: draft.content_markdown,
      content_html: rendered.html,
      toc: rendered.tableOfContents,
      reading_time: rendered.readingTime,
      status: draft.status,
      // Publishing without an explicit date means "now".
      published_at:
        draft.status === 'published'
          ? draft.published_at ?? new Date().toISOString()
          : draft.published_at,
      // Primary author first, then co-authors in the order they were set.
      author_ids: [draft.author_id, ...draft.co_author_ids].filter(Boolean),
      category_id: draft.category_id,
      tags: draft.tags,
      feature_image: draft.feature_image,
      previous_slug: draft.previous_slug || null,
      next_slug: draft.next_slug || null,
      validation: draft.validation
    }
  })
}

/**
 * Moves an article to the trash. Nothing is deleted, so its tags, co-authors
 * and group placements all survive a restore. A trashed article is left out
 * of the next publish, which takes it off the public site.
 */
export async function trashArticle(id: string): Promise<void> {
  await mutate('trashArticles', [id])
}

/** Puts a trashed article back at whatever status it held when it was trashed. */
export async function restoreArticle(id: string): Promise<void> {
  await mutate('restoreArticle', id)
}

/** The real delete, and the only one. Only works on an article in the trash. */
export async function destroyArticle(id: string): Promise<void> {
  await mutate('destroyArticle', id)
}

/** The trash, newest first. */
export async function listTrashedArticles(): Promise<ArticleTrashRow[]> {
  return rpc<ArticleTrashRow[]>('listTrashedArticles')
}

export async function setArticleStatus(
  id: string,
  status: ArticleStatus
): Promise<void> {
  await mutate('setArticlesStatus', { ids: [id], status })
}

/** Bulk edits from the article list's selection. */
export async function setArticlesCategory(
  ids: string[],
  categoryId: string | null
): Promise<void> {
  if (ids.length === 0) return
  await mutate('setArticlesCategory', { ids, categoryId })
}

export async function setArticlesStatus(
  ids: string[],
  status: ArticleStatus
): Promise<void> {
  if (ids.length === 0) return
  await mutate('setArticlesStatus', { ids, status })
}

export async function trashArticles(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await mutate('trashArticles', ids)
}

export async function isSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  return rpc<boolean>('isSlugAvailable', { slug, excludeId })
}

export async function listAllTags(): Promise<TagRow[]> {
  return rpc<TagRow[]>('listAllTags')
}
