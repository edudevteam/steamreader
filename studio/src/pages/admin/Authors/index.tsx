import { useCallback, useEffect, useState } from 'react'
import {
  deleteAuthor,
  listAuthors,
  saveAuthor,
  type AuthorInput,
  type AuthorRow
} from 'lib/cms/authors'
import { uploadImage } from 'lib/cms/uploads'
import { generateSlug } from 'lib/markdown'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Textarea
} from 'components/admin/ui'

const SOCIAL_FIELDS = [
  ['website', 'Website'],
  ['github', 'GitHub'],
  ['twitter', 'Twitter / X'],
  ['linkedin', 'LinkedIn']
] as const

const BLANK: AuthorInput = {
  name: '',
  slug: '',
  bio: '',
  avatar_url: '',
  social: {}
}

/**
 * Authors are bylines: a name, the /author/<slug> page, and an optional bio,
 * photo and links. They used to be accounts; now nobody signs in as one.
 */
export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState<AuthorInput | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AuthorRow | null>(null)
  const [reassignTo, setReassignTo] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setAuthors(await listAuthors())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load authors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openEditor = (author?: AuthorRow) => {
    setError(null)
    setSlugTouched(Boolean(author))
    setForm(author ? { ...author, social: author.social ?? {} } : BLANK)
  }

  const update = (patch: Partial<AuthorInput>) =>
    setForm((current) => (current ? { ...current, ...patch } : current))

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim()) return setError('The author needs a name.')

    setBusy(true)
    setError(null)
    try {
      // Empty links are dropped so the published JSON stays clean.
      const social = Object.fromEntries(
        Object.entries(form.social ?? {}).filter(([, value]) => value?.trim())
      )
      await saveAuthor({ ...form, social })
      setForm(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the author')
    } finally {
      setBusy(false)
    }
  }

  const handlePhoto = async (file: File) => {
    setError(null)
    try {
      update({ avatar_url: await uploadImage(file, 'avatars') })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteAuthor(pendingDelete.id, reassignTo || undefined)
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete the author'
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingBlock label="Loading authors…" />

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Authors</h1>
          <p className="mt-1 text-sm text-gray-500">
            The names articles are credited to. Each one with a published
            article gets a page at /author/&lt;slug&gt;.
          </p>
        </div>
        <Button variant="primary" onClick={() => openEditor()}>
          New author
        </Button>
      </div>

      {error && !form && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Card>
        {authors.length === 0 ? (
          <EmptyState
            title="No authors yet"
            description="Add one before writing, so articles have someone to credit."
          />
        ) : (
          <ul className="divide-y divide-gray-200">
            {authors.map((author) => (
              <li key={author.id} className="flex items-center gap-4 px-5 py-4">
                {author.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt=""
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-600">
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {author.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    /author/{author.slug} · {author.article_count}{' '}
                    {author.article_count === 1 ? 'article' : 'articles'}
                  </p>
                </div>
                <Button onClick={() => openEditor(author)}>Edit</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReassignTo('')
                    setPendingDelete(author)
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={form !== null}
        title={form?.id ? 'Edit author' : 'New author'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={busy}>
              Save author
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            {error && <Alert kind="error">{error}</Alert>}

            <div className="flex items-center gap-4">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="size-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-600">
                  {(form.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <label className="cursor-pointer rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handlePhoto(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>

            <Field label="Name" required>
              <Input
                value={form.name}
                onChange={(e) =>
                  update({
                    name: e.target.value,
                    slug: slugTouched ? form.slug : generateSlug(e.target.value)
                  })
                }
              />
            </Field>

            <Field label="Slug" hint={`/author/${form.slug || 'slug'}`}>
              <Input
                value={form.slug ?? ''}
                className="font-mono"
                onChange={(e) => {
                  setSlugTouched(true)
                  update({ slug: generateSlug(e.target.value) })
                }}
              />
            </Field>

            <Field label="Bio">
              <Textarea
                rows={3}
                value={form.bio ?? ''}
                onChange={(e) => update({ bio: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input
                    value={form.social?.[key] ?? ''}
                    placeholder="https://"
                    onChange={(e) =>
                      update({
                        social: { ...form.social, [key]: e.target.value }
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pendingDelete !== null}
        title="Delete author"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              Delete
            </Button>
          </>
        }
      >
        {pendingDelete && (
          <div className="space-y-4 text-sm text-gray-700">
            <p>
              <strong>{pendingDelete.name}</strong> is credited on{' '}
              {pendingDelete.article_count}{' '}
              {pendingDelete.article_count === 1 ? 'article' : 'articles'}. The
              articles stay; only the credit changes.
            </p>
            <Field label="Credit their articles to">
              <Select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
              >
                <option value="">Nobody (remove from the byline)</option>
                {authors
                  .filter((a) => a.id !== pendingDelete.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
