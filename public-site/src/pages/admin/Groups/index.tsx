/**
 * Group list, and the group categories beside it.
 *
 * Two tabs rather than two nav entries, matching Categories & Tags: a category
 * only exists to sort groups, so it belongs next to the groups rather than a
 * click away. Creating and reordering lessons happens in the group editor;
 * this page is the index, the category CRUD and the delete confirmations.
 *
 * Editor/admin only, matching the "Staff manage groups" policy. The route
 * enforces it -- see the router.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteGroup, listGroups } from 'lib/cms/groups'
import {
  deleteGroupCategory,
  listGroupCategories,
  saveGroupCategory
} from 'lib/cms/taxonomy'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Textarea
} from 'components/admin/ui'
import { classNames } from 'utils'
import type { GroupCategoryRow, GroupRow } from 'types'

type Tab = 'groups' | 'categories'

export default function AdminGroupsPage() {
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('groups')
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [categories, setCategories] = useState<GroupCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<GroupRow | null>(null)
  const [editingCategory, setEditingCategory] =
    useState<Partial<GroupCategoryRow> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextGroups, nextCategories] = await Promise.all([
        listGroups(),
        listGroupCategories()
      ])
      setGroups(nextGroups)
      setCategories(nextCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load groups')
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
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusyId(pendingDelete.id)
    try {
      await deleteGroup(pendingDelete.id)
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete group')
      setPendingDelete(null)
    } finally {
      setBusyId(null)
    }
  }

  // Deleting a category uncategorises its groups rather than removing them --
  // ON DELETE SET NULL -- but an uncategorised group drops out of every public
  // section, so the count is worth saying out loud first.
  const removeCategory = (category: GroupCategoryRow) => {
    const warning =
      category.group_count && category.group_count > 0
        ? `${category.name} holds ${category.group_count} group(s). They will become uncategorised and stop appearing on the public site. Continue?`
        : `Delete ${category.name}?`
    if (window.confirm(warning))
      void run(() => deleteGroupCategory(category.id))
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="mt-1 text-sm text-gray-500">
          A group is a set of articles read in order. Its category decides where
          it appears -- groups in <strong>Courses</strong> show up as courses on
          the home page. Every group is readable at /group/&lt;slug&gt;.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {(['groups', 'categories'] as Tab[]).map((option) => (
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
              {option === 'groups' ? groups.length : categories.length})
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          onClick={() =>
            tab === 'groups'
              ? navigate('/admin/groups/new')
              : setEditingCategory({ name: '' })
          }
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New {tab === 'groups' ? 'group' : 'category'}
        </Button>
      </div>

      <Card>
        {loading ? (
          <LoadingBlock label="Loading groups…" />
        ) : tab === 'groups' ? (
          groups.length === 0 ? (
            <EmptyState
              title="No groups yet"
              description="Put a few related articles into a group and pick a category for it."
              action={
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/groups/new')}
                >
                  New group
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className={classNames(
                    'flex items-center justify-between gap-4 px-5 py-3.5',
                    busyId === group.id && 'opacity-50'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {group.feature_image?.src ? (
                      <img
                        src={group.feature_image.src}
                        alt=""
                        className="size-10 shrink-0 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden'
                        }}
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-lg bg-gray-100" />
                    )}
                    <div className="min-w-0">
                      <Link
                        to={`/admin/groups/${group.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-600"
                      >
                        {group.title}
                      </Link>
                      <p className="font-mono text-xs text-gray-400">
                        /group/{group.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <CategoryBadge category={group.category} />
                    <span className="text-xs text-gray-500">
                      {group.lesson_count} lesson
                      {group.lesson_count === 1 ? '' : 's'}
                    </span>
                    <Link
                      to={`/admin/groups/${group.id}`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(group)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : categories.length === 0 ? (
          <EmptyState
            title="No group categories yet"
            description="A category sorts groups into what they are -- Courses, Series, Collections."
            action={
              <Button
                variant="primary"
                onClick={() => setEditingCategory({ name: '' })}
              >
                New category
              </Button>
            }
          />
        ) : (
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
                    {category.slug}
                  </p>
                  {category.description && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {category.group_count ?? 0} group
                    {category.group_count === 1 ? '' : 's'}
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
        )}
      </Card>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete group"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={busyId === pendingDelete?.id}
            >
              Delete group
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete{' '}
          <strong className="text-gray-900">{pendingDelete?.title}</strong>?
          This removes the group and its running order. The{' '}
          {pendingDelete?.lesson_count ?? 0} article
          {pendingDelete?.lesson_count === 1 ? '' : 's'} in it are not touched.
        </p>
      </Modal>

      <Modal
        open={Boolean(editingCategory)}
        title={
          editingCategory?.id ? 'Edit group category' : 'New group category'
        }
        onClose={() => setEditingCategory(null)}
        footer={
          <>
            <Button onClick={() => setEditingCategory(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                run(() =>
                  saveGroupCategory(editingCategory as GroupCategoryRow)
                )
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
              placeholder="Courses"
            />
          </Field>
          <Field
            label="Slug"
            hint="Leave blank to generate it from the name. The home page looks for the slug “courses”."
          >
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
    </div>
  )
}

/**
 * Uncategorised is called out rather than left blank: it is the one state
 * where a group exists but appears nowhere public, and a blank cell reads as
 * "not loaded yet".
 */
function CategoryBadge({ category }: { category: GroupRow['category'] }) {
  if (!category) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300">
        Uncategorised
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {category.name}
    </span>
  )
}
