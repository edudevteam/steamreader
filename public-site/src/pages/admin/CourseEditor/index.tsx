/**
 * Course editor: cover material on the left, running order on the right.
 *
 * Lessons move with up/down buttons rather than drag-and-drop. Dragging would
 * mean a new dependency and a keyboard-accessible fallback anyway, and a
 * course is a handful of lessons, not a hundred.
 *
 * Position is never edited directly -- it is the index in `lessons` at save
 * time, so the list on screen is the running order by construction.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCourse, isCourseSlugAvailable, saveCourse } from 'lib/cms/courses'
import { listArticles } from 'lib/cms/articles'
import { generateSlug } from 'lib/markdown'
import ImageField from 'components/admin/editor/ImageField'
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  SectionHeading,
  StatusBadge,
  Textarea
} from 'components/admin/ui'
import { classNames } from 'utils'
import { emptyCourse } from 'types/cms'
import type { ArticleRow, CourseDraft, CourseLesson } from 'types'

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [draft, setDraft] = useState<CourseDraft>(emptyCourse)
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return

    let cancelled = false
    setLoading(true)

    getCourse(id!)
      .then((course) => {
        if (cancelled) return
        if (!course) {
          setError('That course does not exist.')
          return
        }
        setDraft(course)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [id, isNew])

  // Every article the account may see, drafts included: a course is often
  // assembled before its later lessons are published.
  useEffect(() => {
    listArticles()
      .then(setArticles)
      .catch((err: Error) => setError(err.message))
  }, [])

  const update = useCallback(
    <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }))
      setNotice(null)
    },
    []
  )

  const chosen = useMemo(
    () => new Set(draft.lessons.map((lesson) => lesson.article_id)),
    [draft.lessons]
  )

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return articles
      .filter((row) => !chosen.has(row.id))
      .filter(
        (row) =>
          !term ||
          row.title.toLowerCase().includes(term) ||
          row.slug.toLowerCase().includes(term)
      )
      .slice(0, 20)
  }, [articles, chosen, search])

  const addLesson = (row: ArticleRow) => {
    update('lessons', [
      ...draft.lessons,
      {
        article_id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        // Candidates come from `article_list`, which never returns trashed
        // rows, so anything addable here is by definition not in the trash.
        trashed: false
      }
    ])
  }

  const removeLesson = (articleId: string) => {
    update(
      'lessons',
      draft.lessons.filter((lesson) => lesson.article_id !== articleId)
    )
  }

  const moveLesson = (from: number, to: number) => {
    if (to < 0 || to >= draft.lessons.length) return
    const next = [...draft.lessons]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update('lessons', next)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      if (!draft.title.trim()) throw new Error('A course needs a title.')

      const slug = (
        draft.slug.trim() || generateSlug(draft.title)
      ).toLowerCase()
      if (!(await isCourseSlugAvailable(slug, draft.id))) {
        throw new Error(`The slug "${slug}" is already used by another course.`)
      }

      const courseId = await saveCourse({ ...draft, slug })

      if (isNew) {
        navigate(`/admin/courses/${courseId}`, { replace: true })
      } else {
        setDraft((current) => ({ ...current, slug }))
      }
      setNotice('Course saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the course')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading course…" />

  // Both counts describe lessons a reader cannot open, but they need different
  // fixes -- publish it, or restore it from the trash -- so they are reported
  // separately.
  const trashed = draft.lessons.filter((lesson) => lesson.trashed).length
  const unpublished = draft.lessons.filter(
    (lesson) => !lesson.trashed && lesson.status !== 'published'
  ).length

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/courses')}
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Courses
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {isNew ? 'New course' : draft.title || 'Untitled course'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && draft.slug && (
            <a
              href={`/course/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              View
            </a>
          )}
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save course
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading
            title="Course details"
            description="What a reader sees on the course card and at the top of the course page."
          />

          <div className="mt-5 space-y-4">
            <Field label="Title" required>
              <Input
                value={draft.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Intro to Robotics"
              />
            </Field>

            <Field
              label="Slug"
              hint="Leave blank to generate it from the title."
            >
              <Input
                value={draft.slug}
                onChange={(e) => update('slug', e.target.value)}
                className="font-mono"
                placeholder="intro-to-robotics"
              />
            </Field>

            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Six lessons taking you from a bare board to a line-following robot."
              />
            </Field>

            <Field label="Sort order" hint="Lower numbers appear first.">
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(e) => update('sort_order', Number(e.target.value))}
              />
            </Field>

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-900">
                Cover image
              </span>
              <ImageField
                value={draft.feature_image}
                onChange={(image) => update('feature_image', image)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Lessons"
            description="Read in this order. An article can belong to more than one course."
          />

          {trashed > 0 && (
            <div className="mt-4">
              <Alert kind="error">
                {trashed} lesson{trashed === 1 ? ' is' : 's are'} in the trash.
                Restore {trashed === 1 ? 'it' : 'them'} from{' '}
                <Link
                  to="/admin/articles/trash"
                  className="font-medium underline"
                >
                  Trash
                </Link>
                , or remove {trashed === 1 ? 'it' : 'them'} from this course.
              </Alert>
            </div>
          )}

          {unpublished > 0 && (
            <div className="mt-4">
              <Alert kind="info">
                {unpublished} lesson{unpublished === 1 ? ' is' : 's are'} not
                published yet, so {unpublished === 1 ? 'it is' : 'they are'}{' '}
                hidden from readers until published. The rest of the course
                still works.
              </Alert>
            </div>
          )}

          <ol className="mt-5 space-y-2">
            {draft.lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.article_id}
                lesson={lesson}
                index={index}
                total={draft.lessons.length}
                onMove={moveLesson}
                onRemove={removeLesson}
              />
            ))}
          </ol>

          {draft.lessons.length === 0 && (
            <p className="mt-5 rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No lessons yet. Add articles from below.
            </p>
          )}

          <div className="mt-6 border-t border-gray-200 pt-5">
            <Field label="Add an article">
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or slug…"
              />
            </Field>

            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {candidates.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => addLesson(row)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-gray-900">
                        {row.title}
                      </span>
                      <span className="block truncate font-mono text-xs text-gray-400">
                        /{row.slug}
                      </span>
                    </span>
                    <StatusBadge status={row.status} />
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500">
                  {search.trim()
                    ? 'Nothing matches that search.'
                    : 'Every article you can see is already in this course.'}
                </li>
              )}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

function LessonRow({
  lesson,
  index,
  total,
  onMove,
  onRemove
}: {
  lesson: CourseLesson
  index: number
  total: number
  onMove: (from: number, to: number) => void
  onRemove: (articleId: string) => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <span className="w-6 shrink-0 text-center text-xs font-medium text-gray-500">
        {index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">
          {lesson.title}
        </span>
        <span className="block truncate font-mono text-xs text-gray-400">
          /{lesson.slug}
        </span>
      </span>

      {lesson.trashed ? (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-300">
          In trash
        </span>
      ) : (
        lesson.status !== 'published' && <StatusBadge status={lesson.status} />
      )}

      <span className="flex shrink-0 items-center">
        <MoveButton
          label={`Move ${lesson.title} up`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          d="M5 15l7-7 7 7"
        />
        <MoveButton
          label={`Move ${lesson.title} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          d="M19 9l-7 7-7-7"
        />
        <button
          type="button"
          onClick={() => onRemove(lesson.article_id)}
          aria-label={`Remove ${lesson.title} from this course`}
          className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-700"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>
    </li>
  )
}

function MoveButton({
  label,
  disabled,
  onClick,
  d
}: {
  label: string
  disabled: boolean
  onClick: () => void
  d: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={classNames(
        'rounded p-1 text-gray-400',
        disabled ? 'opacity-30' : 'hover:bg-gray-200 hover:text-gray-700'
      )}
    >
      <svg
        className="size-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  )
}
