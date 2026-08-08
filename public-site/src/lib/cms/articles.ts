/**
 * CMS article reads and writes.
 *
 * Visibility is not enforced here -- it is enforced by RLS. `listArticles`
 * returns whatever the caller is allowed to see, which is their own articles
 * for a writer and every article for an editor or admin. The `mine` flag is a
 * UI filter, not a security boundary.
 */
import { supabase } from 'lib/supabase'
import {
  generateSlug,
  renderArticleContent,
  generateExcerpt
} from 'lib/markdown'
import { invalidateContent } from 'hooks/useContent'
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
  let query = supabase.from('article_list').select('*')

  if (options.status && options.status !== 'all')
    query = query.eq('status', options.status)
  if (options.search) query = query.ilike('title', `%${options.search}%`)

  // Drafts have no publish date, so order by last touched to keep them visible.
  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as ArticleRow[]

  // "Mine" covers co-authored work too, so it cannot be a column filter -- the
  // byline lives in a jsonb array. RLS has already narrowed the set to what
  // this account may see, so filtering the rest here costs nothing.
  if (options.mine && options.authorId) {
    const id = options.authorId
    return rows.filter(
      (row) =>
        row.author_id === id ||
        (row.authors ?? []).some((person) => person.id === id)
    )
  }

  return rows
}

export async function getArticle(id: string): Promise<ArticleDetailRow | null> {
  const { data, error } = await supabase
    .from('article_detail')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data as ArticleDetailRow) ?? null
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
    co_authors_can_edit: row.co_authors_can_edit ?? false,
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

/** Ensures every tag on the draft exists, returning their ids. */
async function resolveTagIds(
  tags: { slug: string; name: string }[]
): Promise<string[]> {
  if (tags.length === 0) return []

  const normalized = tags.map((t) => ({
    slug: t.slug || generateSlug(t.name),
    name: t.name.trim()
  }))

  // Upsert on slug so two writers adding "robotics" at once cannot collide.
  const { data, error } = await supabase
    .from('tags')
    .upsert(normalized, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id, slug')

  if (error) throw error
  return (data ?? []).map((t) => t.id)
}

async function syncArticleTags(
  articleId: string,
  tagIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('article_tags')
    .delete()
    .eq('article_id', articleId)

  if (deleteError) throw deleteError
  if (tagIds.length === 0) return

  const { error } = await supabase
    .from('article_tags')
    .insert(tagIds.map((tag_id) => ({ article_id: articleId, tag_id })))

  if (error) throw error
}

/**
 * Rewrites the co-author list, preserving the order the editor put them in.
 *
 * Only the primary author and staff may touch `article_authors`, so callers
 * gate this behind `syncCoAuthors` -- a co-author saving a shared draft would
 * otherwise hit a 42501 on every save.
 */
async function syncCoAuthors(
  articleId: string,
  primaryId: string | null,
  coAuthorIds: string[]
): Promise<void> {
  // A stale row naming the primary author would double their byline.
  const ids = coAuthorIds.filter((id) => id && id !== primaryId)

  const { error: deleteError } = await supabase
    .from('article_authors')
    .delete()
    .eq('article_id', articleId)

  if (deleteError) throw translateError(deleteError)
  if (ids.length === 0) return

  const { error } = await supabase.from('article_authors').insert(
    ids.map((author_id, index) => ({
      article_id: articleId,
      author_id,
      sort_order: index
    }))
  )

  if (error) throw translateError(error)
}

export interface SaveResult {
  id: string
  slug: string
}

export interface SaveOptions {
  /**
   * Whether this account may rewrite the co-author list -- true for the
   * primary author and for staff. False for a co-author editing a shared
   * draft, whose save must leave the byline alone.
   */
  syncCoAuthors?: boolean
}

/**
 * Persists a draft. Markdown is the source of truth; the HTML, table of
 * contents and reading time are derived here so readers never pay for a
 * markdown parse and the stored HTML matches the build pipeline exactly.
 */
export async function saveArticle(
  draft: ArticleDraft,
  options: SaveOptions = {}
): Promise<SaveResult> {
  const title = draft.title.trim() || 'Untitled'
  const slug = (draft.slug.trim() || generateSlug(title)).toLowerCase()
  const excerpt =
    draft.excerpt.trim() || generateExcerpt(draft.content_markdown)

  const rendered = renderArticleContent(draft.content_markdown, excerpt)

  const payload = {
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
    author_id: draft.author_id,
    co_authors_can_edit: draft.co_authors_can_edit,
    category_id: draft.category_id,
    feature_image: draft.feature_image,
    previous_slug: draft.previous_slug || null,
    next_slug: draft.next_slug || null,
    validation: draft.validation
  }

  let articleId = draft.id

  if (articleId) {
    const { error } = await supabase
      .from('articles')
      .update(payload)
      .eq('id', articleId)
    if (error) throw translateError(error)
  } else {
    const { data, error } = await supabase
      .from('articles')
      .insert({ ...payload, created_by: draft.author_id })
      .select('id')
      .single()

    if (error) throw translateError(error)
    articleId = data.id
  }

  await syncArticleTags(articleId!, await resolveTagIds(draft.tags))

  if (options.syncCoAuthors !== false)
    await syncCoAuthors(articleId!, draft.author_id, draft.co_author_ids)

  // Public pages cache the article index; a save must show up immediately.
  invalidateContent()

  return { id: articleId!, slug }
}

/**
 * Moves an article to the trash. Nothing is deleted, so its votes, tags,
 * co-authors and course placements all survive a restore.
 *
 * `article_list` filters trashed rows out, so this is enough to take the
 * article off every public page and out of the admin list at once. Who may
 * trash what is enforced by the database, not here -- see fix-07.
 */
export async function trashArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw translateError(error)
  invalidateContent()
}

/** Puts a trashed article back at whatever status it held when it was trashed. */
export async function restoreArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) throw translateError(error)
  invalidateContent()
}

/**
 * The real delete, and the only one. Takes the article's votes with it through
 * ON DELETE CASCADE and cannot be undone.
 *
 * The `deleted_at` filter is belt and braces -- the DELETE policies already
 * require the row to be in the trash -- but it turns a mistaken call on a live
 * article into a no-op rather than a permissions error.
 */
export async function destroyArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
    .not('deleted_at', 'is', null)

  if (error) throw translateError(error)
  invalidateContent()
}

/**
 * The trash, newest first. The view already scopes rows to the accounts that
 * can act on them -- the primary author, and staff -- so there is no `mine`
 * flag to pass.
 */
export async function listTrashedArticles(): Promise<ArticleTrashRow[]> {
  const { data, error } = await supabase
    .from('article_trash')
    .select('*')
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ArticleTrashRow[]
}

export async function setArticleStatus(
  id: string,
  status: ArticleStatus
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (status === 'published') patch.published_at = new Date().toISOString()

  const { error } = await supabase.from('articles').update(patch).eq('id', id)
  if (error) throw translateError(error)
  invalidateContent()
}

export async function isSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from('articles').select('id').eq('slug', slug)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.limit(1)
  if (error) throw error
  return (data ?? []).length === 0
}

export async function listAllTags(): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, slug, name')
    .order('name')
  if (error) throw error
  return (data ?? []) as TagRow[]
}

/** Turns Postgres error codes into something a writer can act on. */
function translateError(error: { code?: string; message: string }): Error {
  if (error.code === '23505')
    return new Error('That slug is already in use by another article.')
  if (error.code === '42501') {
    // Order matters: these are substring tests against the trigger's own
    // wording, and the trash messages overlap the others. "Only an editor can
    // trash or restore a published article" contains both "publish" and
    // "trash", so it has to be matched before either of them.
    if (error.message.includes('published article'))
      return new Error(
        'Only an editor can trash or restore a published article.'
      )
    if (error.message.includes('Restore this article'))
      return new Error('Restore this article from the trash before editing it.')
    if (error.message.includes('trash'))
      return new Error(
        'Only the primary author or an editor can move this article to the trash.'
      )
    if (error.message.includes('publish'))
      return new Error(
        'Only editors and admins can publish. Submit for review instead.'
      )
    if (error.message.includes('reassign'))
      return new Error(
        'Only the primary author or an editor can reassign this article.'
      )
    if (error.message.includes('co-author'))
      return new Error(
        'Only the primary author or an editor can change who may edit this article.'
      )
    return new Error('You do not have permission to change this article.')
  }
  return new Error(error.message)
}
