import { useCallback, useEffect, useState } from 'react'
import {
  deleteCategory,
  deleteTag,
  listCategories,
  listTags,
  saveCategory,
  saveTag
} from 'lib/cms/taxonomy'
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Textarea
} from 'components/admin/ui'
import { classNames } from 'utils'
import type { CategoryRow, TagRow } from 'types'

type Tab = 'categories' | 'tags'

export default function AdminTaxonomyPage() {
  const [tab, setTab] = useState<Tab>('categories')
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [tags, setTags] = useState<TagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editingCategory, setEditingCategory] =
    useState<Partial<CategoryRow> | null>(null)
  const [editingTag, setEditingTag] = useState<Partial<TagRow> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextCategories, nextTags] = await Promise.all([
        listCategories(),
        listTags()
      ])
      setCategories(nextCategories)
      setTags(nextTags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load taxonomy')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setEditingCategory(null)
      setEditingTag(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const removeCategory = (category: CategoryRow) => {
    const warning =
      category.article_count && category.article_count > 0
        ? `${category.name} is used by ${category.article_count} article(s). They will become uncategorised. Continue?`
        : `Delete ${category.name}?`
    if (window.confirm(warning)) void run(() => deleteCategory(category.id))
  }

  const removeTag = (tag: TagRow) => {
    if (
      window.confirm(
        `Delete the tag "${tag.name}"? It will be removed from every article.`
      )
    ) {
      void run(() => deleteTag(tag.id))
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories & Tags</h1>
        <p className="mt-1 text-sm text-gray-500">
          These power the category pages, tag pages and the site navigation.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {(['categories', 'tags'] as Tab[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={classNames(
                'rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                tab === option
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              )}
            >
              {option} (
              {option === 'categories' ? categories.length : tags.length})
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          onClick={() =>
            tab === 'categories'
              ? setEditingCategory({ name: '' })
              : setEditingTag({ name: '' })
          }
        >
          New {tab === 'categories' ? 'category' : 'tag'}
        </Button>
      </div>

      <Card>
        {loading ? (
          <LoadingBlock />
        ) : tab === 'categories' ? (
          <ul className="divide-y divide-gray-100">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {category.name}
                  </p>
                  <p className="font-mono text-xs text-gray-400">
                    /category/{category.slug}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {category.article_count ?? 0} articles
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(category)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap gap-2 p-5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-sm text-gray-700"
              >
                {tag.name}
                <span className="text-xs text-gray-400">
                  {tag.article_count ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingTag(tag)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`Edit ${tag.name}`}
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-700"
                  aria-label={`Delete ${tag.name}`}
                >
                  <svg
                    className="size-3.5"
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
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-gray-500">No tags yet.</p>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(editingCategory)}
        title={editingCategory?.id ? 'Edit category' : 'New category'}
        onClose={() => setEditingCategory(null)}
        footer={
          <>
            <Button onClick={() => setEditingCategory(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                run(() => saveCategory(editingCategory as CategoryRow))
              }
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={editingCategory?.name ?? ''}
              onChange={(e) =>
                setEditingCategory({ ...editingCategory, name: e.target.value })
              }
              placeholder="Technology"
            />
          </Field>
          <Field label="Slug" hint="Leave blank to generate it from the name.">
            <Input
              value={editingCategory?.slug ?? ''}
              onChange={(e) =>
                setEditingCategory({ ...editingCategory, slug: e.target.value })
              }
              className="font-mono"
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={editingCategory?.description ?? ''}
              onChange={(e) =>
                setEditingCategory({
                  ...editingCategory,
                  description: e.target.value
                })
              }
            />
          </Field>
          <Field label="Sort order" hint="Lower numbers appear first.">
            <Input
              type="number"
              value={editingCategory?.sort_order ?? 0}
              onChange={(e) =>
                setEditingCategory({
                  ...editingCategory,
                  sort_order: Number(e.target.value)
                })
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingTag)}
        title={editingTag?.id ? 'Edit tag' : 'New tag'}
        onClose={() => setEditingTag(null)}
        footer={
          <>
            <Button onClick={() => setEditingTag(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() => run(() => saveTag(editingTag as TagRow))}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={editingTag?.name ?? ''}
              onChange={(e) =>
                setEditingTag({ ...editingTag, name: e.target.value })
              }
              placeholder="robotics"
            />
          </Field>
          <Field label="Slug" hint="Leave blank to generate it from the name.">
            <Input
              value={editingTag?.slug ?? ''}
              onChange={(e) =>
                setEditingTag({ ...editingTag, slug: e.target.value })
              }
              className="font-mono"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
