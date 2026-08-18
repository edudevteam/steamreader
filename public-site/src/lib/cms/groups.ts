/**
 * Group reads and writes.
 *
 * A group is an ordered list of articles -- `groups` holds the cover material
 * and the category, `group_articles` holds the membership and the running
 * order. Writes are editor/admin only, enforced by the "Staff manage groups"
 * policy rather than by anything here.
 *
 * Lessons are read through `articles` rather than `article_list` so the editor
 * can see drafts it may include. The public group page reads the same join as
 * anon, where RLS drops anything unpublished, so a draft lesson is invisible
 * to readers until it goes live -- which is why `GroupLesson` carries status.
 */
import { supabase } from 'lib/supabase'
import { generateSlug } from 'lib/markdown'
import { invalidateContent } from 'hooks/useContent'
import type {
  ArticleStatus,
  CategoryRef,
  GroupDraft,
  GroupLesson,
  GroupRow
} from 'types'

/** The join row as PostgREST returns it, with the article embedded. */
interface LessonJoin {
  position: number
  article_id: string
  articles: {
    slug: string
    title: string
    status: ArticleStatus
    deleted_at: string | null
  } | null
}

/**
 * Turns the embedded join rows into lessons in reading order.
 *
 * `articles` comes back null when the row is hidden from the caller, which
 * should not happen for the staff who reach this editor -- they can read every
 * article, trashed ones included. Those are dropped rather than rendered as a
 * blank lesson, and the trashed ones are flagged instead, since the join row
 * survives trashing and a restore puts the lesson straight back.
 */
function toLessons(rows: LessonJoin[] | null | undefined): GroupLesson[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((row) =>
      row.articles
        ? [
            {
              article_id: row.article_id,
              slug: row.articles.slug,
              title: row.articles.title,
              status: row.articles.status,
              trashed: Boolean(row.articles.deleted_at)
            }
          ]
        : []
    )
}

export async function listGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_categories(slug, name), group_articles(count)')
    .order('sort_order')
    .order('title')

  if (error) throw error

  type Row = Omit<GroupRow, 'lesson_count' | 'category'> & {
    group_categories: CategoryRef | null
    group_articles: { count: number }[]
  }

  return ((data ?? []) as Row[]).map(
    ({ group_categories, group_articles, ...group }) => ({
      ...group,
      category: group_categories,
      lesson_count: group_articles?.[0]?.count ?? 0
    })
  )
}

export async function getGroup(id: string): Promise<GroupDraft | null> {
  const { data, error } = await supabase
    .from('groups')
    .select(
      'id, slug, title, description, feature_image, category_id, sort_order, ' +
        'group_articles(position, article_id, articles(slug, title, status, deleted_at))'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as Omit<GroupDraft, 'lessons'> & {
    group_articles: LessonJoin[]
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    feature_image: row.feature_image?.src
      ? row.feature_image
      : { src: '', alt: '' },
    category_id: row.category_id ?? null,
    sort_order: row.sort_order ?? 0,
    lessons: toLessons(row.group_articles)
  }
}

/**
 * Rewrites the running order.
 *
 * Cleared and reinserted rather than diffed, the same way article tags are:
 * `group_articles` has no surrogate key, so a reorder is a rewrite of
 * `position` across most of the rows anyway.
 */
async function syncLessons(
  groupId: string,
  lessons: GroupLesson[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('group_articles')
    .delete()
    .eq('group_id', groupId)

  if (deleteError) throw deleteError
  if (lessons.length === 0) return

  const { error } = await supabase.from('group_articles').insert(
    lessons.map((lesson, index) => ({
      group_id: groupId,
      article_id: lesson.article_id,
      position: index
    }))
  )

  if (error) throw error
}

export async function saveGroup(draft: GroupDraft): Promise<string> {
  const title = draft.title.trim() || 'Untitled group'
  const payload = {
    slug: (draft.slug.trim() || generateSlug(title)).toLowerCase(),
    title,
    description: draft.description.trim(),
    feature_image: draft.feature_image,
    category_id: draft.category_id,
    sort_order: draft.sort_order
  }

  let groupId = draft.id

  if (groupId) {
    const { error } = await supabase
      .from('groups')
      .update(payload)
      .eq('id', groupId)
    if (error) throw translateError(error)
  } else {
    const { data, error } = await supabase
      .from('groups')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw translateError(error)
    groupId = data.id
  }

  await syncLessons(groupId!, draft.lessons)

  invalidateContent('groups')
  return groupId!
}

export async function deleteGroup(id: string): Promise<void> {
  // `group_articles` cascades, so this unpicks the group without touching the
  // articles that were in it.
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw translateError(error)
  invalidateContent('groups')
}

export async function isGroupSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from('groups').select('id').eq('slug', slug)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.limit(1)
  if (error) throw error
  return (data ?? []).length === 0
}

function translateError(error: { code?: string; message: string }): Error {
  if (error.code === '23505')
    return new Error('That slug is already in use by another group.')
  if (error.code === '42501')
    return new Error('Only editors and admins can manage groups.')
  return new Error(error.message)
}
