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

  if (options.mine && options.authorId)
    query = query.eq('author_id', options.authorId)
  if (options.status && options.status !== 'all')
    query = query.eq('status', options.status)
  if (options.search) query = query.ilike('title', `%${options.search}%`)

  // Drafts have no publish date, so order by last touched to keep them visible.
  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ArticleRow[]
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

  // Public pages cache the article index; a save must show up immediately.
  invalidateContent()

  return { id: articleId!, slug }
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw translateError(error)
  invalidateContent()
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
    return new Error(
      error.message.includes('publish')
        ? 'Only editors and admins can publish. Submit for review instead.'
        : 'You do not have permission to change this article.'
    )
  }
  return new Error(error.message)
}
