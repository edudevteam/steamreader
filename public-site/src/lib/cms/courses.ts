/**
 * Course reads and writes.
 *
 * A course is an ordered list of articles -- `courses` holds the cover
 * material, `course_articles` holds the membership and the running order.
 * Writes are editor/admin only, enforced by the "Staff manage courses" policy
 * rather than by anything here.
 *
 * Lessons are read through `articles` rather than `article_list` so the editor
 * can see drafts it may include. The public course page reads the same join as
 * anon, where RLS drops anything unpublished, so a draft lesson is invisible
 * to readers until it goes live -- which is why `CourseLesson` carries status.
 */
import { supabase } from 'lib/supabase'
import { generateSlug } from 'lib/markdown'
import { invalidateContent } from 'hooks/useContent'
import type { ArticleStatus, CourseDraft, CourseLesson, CourseRow } from 'types'

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
 * Turns the embedded join rows into lessons in course order.
 *
 * `articles` comes back null when the row is hidden from the caller, which
 * should not happen for the staff who reach this editor -- they can read every
 * article, trashed ones included. Those are dropped rather than rendered as a
 * blank lesson, and the trashed ones are flagged instead, since the join row
 * survives trashing and a restore puts the lesson straight back.
 */
function toLessons(rows: LessonJoin[] | null | undefined): CourseLesson[] {
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

export async function listCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*, course_articles(count)')
    .order('sort_order')
    .order('title')

  if (error) throw error

  type Row = Omit<CourseRow, 'lesson_count'> & {
    course_articles: { count: number }[]
  }

  return ((data ?? []) as Row[]).map(({ course_articles, ...course }) => ({
    ...course,
    lesson_count: course_articles?.[0]?.count ?? 0
  }))
}

export async function getCourse(id: string): Promise<CourseDraft | null> {
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, slug, title, description, feature_image, sort_order, ' +
        'course_articles(position, article_id, articles(slug, title, status, deleted_at))'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as Omit<CourseDraft, 'lessons'> & {
    course_articles: LessonJoin[]
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    feature_image: row.feature_image?.src
      ? row.feature_image
      : { src: '', alt: '' },
    sort_order: row.sort_order ?? 0,
    lessons: toLessons(row.course_articles)
  }
}

/**
 * Rewrites the running order.
 *
 * Cleared and reinserted rather than diffed, the same way article tags are:
 * `course_articles` has no surrogate key, so a reorder is a rewrite of
 * `position` across most of the rows anyway.
 */
async function syncLessons(
  courseId: string,
  lessons: CourseLesson[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('course_articles')
    .delete()
    .eq('course_id', courseId)

  if (deleteError) throw deleteError
  if (lessons.length === 0) return

  const { error } = await supabase.from('course_articles').insert(
    lessons.map((lesson, index) => ({
      course_id: courseId,
      article_id: lesson.article_id,
      position: index
    }))
  )

  if (error) throw error
}

export async function saveCourse(draft: CourseDraft): Promise<string> {
  const title = draft.title.trim() || 'Untitled course'
  const payload = {
    slug: (draft.slug.trim() || generateSlug(title)).toLowerCase(),
    title,
    description: draft.description.trim(),
    feature_image: draft.feature_image,
    sort_order: draft.sort_order
  }

  let courseId = draft.id

  if (courseId) {
    const { error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
    if (error) throw translateError(error)
  } else {
    const { data, error } = await supabase
      .from('courses')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw translateError(error)
    courseId = data.id
  }

  await syncLessons(courseId!, draft.lessons)

  invalidateContent('courses')
  return courseId!
}

export async function deleteCourse(id: string): Promise<void> {
  // `course_articles` cascades, so this unpicks the course without touching
  // the articles that were in it.
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw translateError(error)
  invalidateContent('courses')
}

export async function isCourseSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from('courses').select('id').eq('slug', slug)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.limit(1)
  if (error) throw error
  return (data ?? []).length === 0
}

function translateError(error: { code?: string; message: string }): Error {
  if (error.code === '23505')
    return new Error('That slug is already in use by another course.')
  if (error.code === '42501')
    return new Error('Only editors and admins can manage courses.')
  return new Error(error.message)
}
