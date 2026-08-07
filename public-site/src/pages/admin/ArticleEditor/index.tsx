import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import {
  getArticle,
  isSlugAvailable,
  listArticles,
  rowToDraft,
  saveArticle
} from 'lib/cms/articles'
import { listCategories } from 'lib/cms/taxonomy'
import { listContributors } from 'lib/cms/users'
import { generateSlug } from 'lib/markdown'
import ContentEditor from 'components/admin/editor/ContentEditor'
import ImageField from 'components/admin/editor/ImageField'
import TagInput from 'components/admin/editor/TagInput'
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  SectionHeading,
  Select,
  StatusBadge,
  Textarea
} from 'components/admin/ui'
import { classNames } from 'utils'
import { emptyDraft, STATUS_LABELS } from 'types/cms'
import type {
  ArticleDraft,
  ArticleRow,
  ArticleStatus,
  CategoryRow,
  Profile
} from 'types'

type Section = 'content' | 'settings' | 'metadata' | 'taxonomy' | 'publishing'

const SECTIONS: { id: Section; label: string; description: string }[] = [
  { id: 'content', label: 'Article', description: 'Title and body' },
  { id: 'settings', label: 'Settings', description: 'Slug, author, series' },
  {
    id: 'metadata',
    label: 'Metadata',
    description: 'Excerpt and feature image'
  },
  {
    id: 'taxonomy',
    label: 'Category & Tags',
    description: 'How readers find it'
  },
  { id: 'publishing', label: 'Publishing', description: 'Status and schedule' }
]

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isEditor } = useAuth()

  const isNew = !id || id === 'new'

  const [section, setSection] = useState<Section>('content')
  const [draft, setDraft] = useState<ArticleDraft>(() =>
    emptyDraft(user?.id ?? null)
  )
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [slugError, setSlugError] = useState<string | null>(null)

  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [contributors, setContributors] = useState<
    Pick<Profile, 'id' | 'display_name' | 'slug' | 'role'>[]
  >([])
  const [siblings, setSiblings] = useState<ArticleRow[]>([])

  // ------------------------------------------------------------------ load

  useEffect(() => {
    if (isNew) {
      setDraft(emptyDraft(user?.id ?? null))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    getArticle(id!)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setError(
            'That article does not exist, or you do not have access to it.'
          )
          return
        }
        setDraft(rowToDraft(row))
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [id, isNew, user?.id])

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
    listArticles()
      .then(setSiblings)
      .catch(() => setSiblings([]))
    // Not gated on isEditor: a writer needs the roster to pick co-authors, and
    // RLS already limits `profiles` reads to contributor rows and safe columns.
    listContributors()
      .then(setContributors)
      .catch(() => setContributors([]))
  }, [])

  // Warn before losing unsaved work to a tab close or refresh.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const update = useCallback(
    <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => {
      setDraft((previous) => ({ ...previous, [key]: value }))
      setDirty(true)
      setNotice(null)
    },
    []
  )

  // The byline and its sharing switch belong to the primary author. A
  // co-author editing a shared draft sees both, read-only.
  const canManageAuthors =
    isEditor || (!!draft.author_id && draft.author_id === user?.id)

  // The primary author is already the first byline; offering them again would
  // let the same person be credited twice.
  const coAuthorChoices = useMemo(
    () => contributors.filter((person) => person.id !== draft.author_id),
    [contributors, draft.author_id]
  )

  const toggleCoAuthor = (personId: string) => {
    setDraft((previous) => ({
      ...previous,
      co_author_ids: previous.co_author_ids.includes(personId)
        ? previous.co_author_ids.filter((id) => id !== personId)
        : // Append rather than insert: selection order is byline order.
          [...previous.co_author_ids, personId]
    }))
    setDirty(true)
    setNotice(null)
  }

  // A new article's slug tracks the title until the author edits it directly.
  const handleTitleChange = (title: string) => {
    setDraft((previous) => ({
      ...previous,
      title,
      slug: slugTouched ? previous.slug : generateSlug(title)
    }))
    setDirty(true)
    setNotice(null)
  }

  // ------------------------------------------------------------------ save

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Give the article a title before saving.'
    if (!draft.slug.trim()) return 'The article needs a slug.'
    if (!draft.author_id) return 'The article needs an author.'
    return null
  }

  const persist = async (status?: ArticleStatus) => {
    const problem = validate()
    if (problem) {
      setError(problem)
      setSection(problem.includes('slug') ? 'settings' : 'content')
      return
    }

    const next = { ...draft, status: status ?? draft.status }

    setSaving(true)
    setError(null)
    setSlugError(null)

    try {
      const available = await isSlugAvailable(next.slug, next.id)
      if (!available) {
        setSlugError('Another article already uses this slug.')
        setSection('settings')
        return
      }

      const result = await saveArticle(next, {
        syncCoAuthors: canManageAuthors
      })
      setDraft({ ...next, id: result.id, slug: result.slug })
      setDirty(false)
      setNotice(
        status === 'published' ? 'Article published.' : 'Changes saved.'
      )

      // Move the URL off /new so a refresh reopens the saved article.
      if (isNew) navigate(`/admin/articles/${result.id}`, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the article'
      )
    } finally {
      setSaving(false)
    }
  }

  const publishLabel = useMemo(() => {
    if (!isEditor)
      return draft.status === 'draft' ? 'Submit for review' : 'Save'
    return draft.status === 'published' ? 'Update published' : 'Publish'
  }, [isEditor, draft.status])

  const handlePublish = () => {
    if (isEditor) return persist('published')
    return persist(draft.status === 'draft' ? 'in_review' : draft.status)
  }

  if (loading) return <LoadingBlock label="Loading article…" />

  // ------------------------------------------------------------------ view

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/articles"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Back to articles
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold text-gray-900">
            {draft.title || 'Untitled article'}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={draft.status} />
            {dirty && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {draft.status === 'published' && draft.id && (
            <a
              href={`/article/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              View live
            </a>
          )}
          <Button onClick={() => persist()} loading={saving}>
            Save draft
          </Button>
          <Button variant="primary" onClick={handlePublish} loading={saving}>
            {publishLabel}
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
      {!isEditor && (
        <div className="mb-4">
          <Alert kind="info">
            As a writer you can save drafts and submit them for review. An
            editor publishes them.
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Side menu */}
        <nav className="lg:w-56 lg:shrink-0">
          <Card className="overflow-hidden p-1.5 lg:sticky lg:top-6">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={classNames(
                  'block w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                  section === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={classNames(
                    'block text-xs',
                    section === item.id ? 'text-brand-500' : 'text-gray-400'
                  )}
                >
                  {item.description}
                </span>
              </button>
            ))}
          </Card>
        </nav>

        {/* Section panel */}
        <div className="min-w-0 flex-1">
          {section === 'content' && (
            <Card className="p-6">
              <div className="space-y-4">
                <Field label="Title" htmlFor="title" required>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="TinkerCAD Circuits Lesson 7"
                    className="text-lg font-semibold"
                  />
                </Field>

                <Field label="Subtitle" htmlFor="subtitle">
                  <Input
                    id="subtitle"
                    value={draft.subtitle}
                    onChange={(e) => update('subtitle', e.target.value)}
                    placeholder="A short line under the title"
                  />
                </Field>

                <div>
                  <span className="block text-sm font-medium text-gray-900">
                    Body
                  </span>
                  <div className="mt-1.5">
                    <ContentEditor
                      value={draft.content_markdown}
                      onChange={(markdown) =>
                        update('content_markdown', markdown)
                      }
                      excerpt={draft.excerpt}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {section === 'settings' && (
            <Card className="p-6">
              <SectionHeading
                title="Settings"
                description="How this article is addressed and who it belongs to."
              />
              <div className="space-y-5">
                <Field
                  label="Slug"
                  htmlFor="slug"
                  required
                  error={slugError ?? undefined}
                  hint={`The article will live at /article/${
                    draft.slug || 'your-slug'
                  }`}
                >
                  <Input
                    id="slug"
                    value={draft.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlugError(null)
                      update('slug', generateSlug(e.target.value))
                    }}
                    className="font-mono"
                    placeholder="tinkercad-circuits-lesson-7"
                  />
                </Field>

                <Field
                  label="Author"
                  htmlFor="author"
                  hint={
                    isEditor
                      ? undefined
                      : 'Only editors can reassign an article.'
                  }
                >
                  <Select
                    id="author"
                    value={draft.author_id ?? ''}
                    disabled={!isEditor}
                    onChange={(e) =>
                      update('author_id', e.target.value || null)
                    }
                  >
                    <option value="">Unassigned</option>
                    {contributors.length === 0 && draft.author_id && (
                      <option value={draft.author_id}>Current author</option>
                    )}
                    {contributors.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.display_name ?? person.slug ?? person.id}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Co-authors"
                  hint={
                    canManageAuthors
                      ? 'Credited alongside the primary author, in the order you tick them.'
                      : 'Only the primary author or an editor can change the byline.'
                  }
                >
                  {coAuthorChoices.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No other contributors to credit yet.
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg p-1 ring-1 ring-inset ring-gray-300">
                      {coAuthorChoices.map((person) => {
                        const position = draft.co_author_ids.indexOf(person.id)
                        return (
                          <label
                            key={person.id}
                            className={classNames(
                              'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm',
                              canManageAuthors
                                ? 'cursor-pointer hover:bg-gray-50'
                                : 'cursor-not-allowed opacity-70'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                              checked={position !== -1}
                              disabled={!canManageAuthors}
                              onChange={() => toggleCoAuthor(person.id)}
                            />
                            <span className="text-gray-900">
                              {person.display_name ?? person.slug ?? person.id}
                            </span>
                            {position !== -1 && (
                              <span className="ml-auto text-xs text-gray-500">
                                #{position + 2} in byline
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </Field>

                {draft.co_author_ids.length > 0 && (
                  <Field
                    label="Co-author editing"
                    hint="Publishing always stays with editors and admins."
                  >
                    <label
                      className={classNames(
                        'flex items-start gap-3 rounded-lg p-3 text-sm ring-1 ring-inset ring-gray-300',
                        canManageAuthors
                          ? 'cursor-pointer hover:bg-gray-50'
                          : 'cursor-not-allowed opacity-70'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                        checked={draft.co_authors_can_edit}
                        disabled={!canManageAuthors}
                        onChange={(e) =>
                          update('co_authors_can_edit', e.target.checked)
                        }
                      />
                      <span>
                        <span className="font-medium text-gray-900">
                          Let co-authors edit this article
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Off by default — co-authors are credited in the byline
                          but cannot open the draft.
                        </span>
                      </span>
                    </label>
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Previous article"
                    hint="Builds the lesson series navigation."
                  >
                    <Select
                      value={draft.previous_slug ?? ''}
                      onChange={(e) =>
                        update('previous_slug', e.target.value || null)
                      }
                    >
                      <option value="">None</option>
                      {siblings
                        .filter((row) => row.slug !== draft.slug)
                        .map((row) => (
                          <option key={row.id} value={row.slug}>
                            {row.title}
                          </option>
                        ))}
                    </Select>
                  </Field>

                  <Field label="Next article">
                    <Select
                      value={draft.next_slug ?? ''}
                      onChange={(e) =>
                        update('next_slug', e.target.value || null)
                      }
                    >
                      <option value="">None</option>
                      {siblings
                        .filter((row) => row.slug !== draft.slug)
                        .map((row) => (
                          <option key={row.id} value={row.slug}>
                            {row.title}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {section === 'metadata' && (
            <Card className="p-6">
              <SectionHeading
                title="Metadata"
                description="What readers see in listings, carousels and search results."
              />
              <div className="space-y-5">
                <Field
                  label="Excerpt"
                  htmlFor="excerpt"
                  hint="Leave blank to generate one from the opening paragraphs."
                >
                  <Textarea
                    id="excerpt"
                    rows={4}
                    value={draft.excerpt}
                    onChange={(e) => update('excerpt', e.target.value)}
                    placeholder="A sentence or two summarising the article."
                  />
                </Field>

                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-900">
                    Feature image
                  </span>
                  <ImageField
                    value={draft.feature_image}
                    onChange={(image) => update('feature_image', image)}
                  />
                </div>
              </div>
            </Card>
          )}

          {section === 'taxonomy' && (
            <Card className="p-6">
              <SectionHeading
                title="Category & Tags"
                description="Drives the category pages, tag pages and related-article carousels."
              />
              <div className="space-y-5">
                <Field label="Category" htmlFor="category">
                  <Select
                    id="category"
                    value={draft.category_id ?? ''}
                    onChange={(e) =>
                      update('category_id', e.target.value || null)
                    }
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Tags"
                  hint="Press Enter or comma to add. New tags are created on save."
                >
                  <TagInput
                    value={draft.tags}
                    onChange={(tags) => update('tags', tags)}
                  />
                </Field>
              </div>
            </Card>
          )}

          {section === 'publishing' && (
            <Card className="p-6">
              <SectionHeading
                title="Publishing"
                description="Control when the article becomes visible to readers."
              />
              <div className="space-y-5">
                <Field
                  label="Status"
                  htmlFor="status"
                  hint={
                    isEditor
                      ? undefined
                      : 'Writers can move an article to draft or in review.'
                  }
                >
                  <Select
                    id="status"
                    value={draft.status}
                    onChange={(e) =>
                      update('status', e.target.value as ArticleStatus)
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as ArticleStatus[])
                      .filter(
                        (key) =>
                          isEditor || key === 'draft' || key === 'in_review'
                      )
                      .map((key) => (
                        <option key={key} value={key}>
                          {STATUS_LABELS[key]}
                        </option>
                      ))}
                  </Select>
                </Field>

                <Field
                  label="Publish date"
                  htmlFor="published"
                  hint="A future date keeps the article hidden until then."
                >
                  <Input
                    id="published"
                    type="datetime-local"
                    value={
                      draft.published_at ? draft.published_at.slice(0, 16) : ''
                    }
                    onChange={(e) =>
                      update(
                        'published_at',
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null
                      )
                    }
                  />
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-gray-900">
                    Validation badges
                  </legend>
                  <p className="mt-1 text-xs text-gray-500">
                    Shown on the article to signal how the content was checked.
                  </p>
                  <div className="mt-3 space-y-2">
                    {(
                      [
                        ['validatedTutorial', 'Validated tutorial'],
                        ['supportedEvidence', 'Supported by evidence']
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(draft.validation?.[key])}
                          onChange={(e) =>
                            update('validation', {
                              ...(draft.validation ?? {}),
                              [key]: e.target.checked
                            })
                          }
                          className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
