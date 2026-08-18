import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import {
  listArticles,
  setArticleStatus,
  setArticlesCategory,
  setArticlesStatus,
  trashArticle,
  trashArticles
} from 'lib/cms/articles'
import { listGroupMemberships } from 'lib/cms/groups'
import { listContributors } from 'lib/cms/users'
import { listCategories } from 'lib/cms/taxonomy'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  Select,
  StatusBadge
} from 'components/admin/ui'
import { classNames, parseDate } from 'utils'
import type {
  ArticleRow,
  ArticleStatus,
  CategoryRow,
  GroupMembership,
  Profile
} from 'types'
import { STATUS_LABELS } from 'types/cms'

type SortKey = 'title' | 'author' | 'category' | 'status' | 'updated'
type SortDir = 'asc' | 'desc'
type Sort = { key: SortKey; dir: SortDir }

// The author, category and group filters share a shape: "all" is no filter,
// "none" picks the articles the taxonomy has missed, anything else is a row id.
const ANY = 'all'
const UNASSIGNED = 'none'

// Matches the order the list arrives in, so the table looks untouched until a
// header is actually clicked.
const DEFAULT_SORT: Sort = { key: 'updated', dir: 'desc' }

// Sorting statuses alphabetically would scatter the workflow across the table;
// rank them the way an article actually travels instead.
const STATUS_ORDER: Record<ArticleStatus, number> = {
  draft: 0,
  in_review: 1,
  published: 2,
  archived: 3
}

// First click on a date column should surface the newest work; first click on a
// name column should read A–Z.
const FIRST_DIR: Record<SortKey, SortDir> = {
  title: 'asc',
  author: 'asc',
  category: 'asc',
  status: 'asc',
  updated: 'desc'
}

const CHECKBOX_CLASS =
  'size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

// The byline is the primary author plus any co-authors, and the `authors`
// aggregate can be missing on a row the view built before co-authoring landed.
const bylineIds = (row: ArticleRow): string[] => {
  const ids = new Set<string>()
  if (row.author_id) ids.add(row.author_id)
  for (const person of row.authors ?? []) ids.add(person.id)
  return [...ids]
}

const bylineHas = (row: ArticleRow, id: string): boolean =>
  row.author_id === id || (row.authors ?? []).some((person) => person.id === id)

const sortValue = (row: ArticleRow, key: SortKey): string | number => {
  switch (key) {
    case 'title':
      return row.title
    case 'author':
      return row.author_name ?? ''
    case 'category':
      return row.category_name ?? ''
    case 'status':
      return STATUS_ORDER[row.status]
    case 'updated':
      return row.updated_at
  }
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort
}: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th
      className="px-4 py-3 font-medium"
      aria-sort={
        active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={classNames(
          'group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-gray-900',
          active && 'text-gray-900'
        )}
      >
        {label}
        <svg
          className={classNames(
            'size-3',
            active
              ? 'text-brand-600'
              : 'text-gray-300 group-hover:text-gray-400'
          )}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {active ? (
            <path
              d={sort.dir === 'asc' ? 'M3 7.5L6 4.5l3 3' : 'M3 4.5L6 7.5l3-3'}
            />
          ) : (
            <>
              <path d="M3.5 5L6 2.5 8.5 5" />
              <path d="M3.5 7L6 9.5 8.5 7" />
            </>
          )}
        </svg>
      </button>
    </th>
  )
}

/**
 * The header checkbox. Its half-selected state is a DOM property rather than
 * an attribute, so it cannot be expressed in JSX and has to be written to the
 * node after every render that changes it.
 */
function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange
}: {
  checked: boolean
  indeterminate: boolean
  disabled: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      className={CHECKBOX_CLASS}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={
        checked ? 'Clear the selection' : 'Select every article in view'
      }
    />
  )
}

export default function AdminArticlesPage() {
  const { user, isEditor } = useAuth()
  const navigate = useNavigate()

  // Writers only ever have their own articles, so the author filter is
  // meaningless for them and is never rendered.
  const [author, setAuthor] = useState<string>(ANY)
  const [status, setStatus] = useState<ArticleStatus | 'all'>('all')
  const [category, setCategory] = useState<string>(ANY)
  const [group, setGroup] = useState<string>(ANY)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [rows, setRows] = useState<ArticleRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [groups, setGroups] = useState<GroupMembership[]>([])
  const [contributors, setContributors] = useState<
    Pick<Profile, 'id' | 'display_name' | 'slug' | 'role'>[]
  >([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingTrash, setPendingTrash] = useState<ArticleRow | null>(null)
  const [bulkTrashOpen, setBulkTrashOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Everyone's work is loaded once and narrowed in place; a writer only
      // ever gets their own rows back, so the flag is for them alone.
      const next = await listArticles({
        mine: !isEditor,
        authorId: user?.id
      })
      setRows(next)

      // An article that has left the list -- trashed, or reassigned away --
      // must not stay in a selection the bulk bar acts on.
      const live = new Set(next.map((row) => row.id))
      setSelected((current) => {
        const kept = [...current].filter((id) => live.has(id))
        return kept.length === current.size ? current : new Set(kept)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load articles')
    } finally {
      setLoading(false)
    }
  }, [isEditor, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The lists the filters and the bulk bar offer. None of them changes while
  // the page is open, so they load once rather than with every refresh, and an
  // empty list simply means one fewer filter to choose from. The byline is a
  // writer's own name every time, so they are spared the contributor read.
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
    listGroupMemberships()
      .then(setGroups)
      .catch(() => setGroups([]))
    if (isEditor)
      listContributors()
        .then(setContributors)
        .catch(() => setContributors([]))
  }, [isEditor])

  // Group membership arrives grouped by group; the filter asks the opposite
  // question, so invert it once. An article can sit in several groups.
  const groupsByArticle = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const entry of groups)
      for (const articleId of entry.article_ids) {
        const existing = map.get(articleId)
        if (existing) existing.add(entry.id)
        else map.set(articleId, new Set([entry.id]))
      }
    return map
  }, [groups])

  // Filtering happens client-side: the list is small enough that a round trip
  // per keystroke would be slower than filtering in place.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false

      // Picking an author should surface the work they co-wrote as well as
      // the work they lead, the way the old "Only mine" toggle did.
      if (author !== ANY && !bylineHas(row, author)) return false

      if (category !== ANY) {
        const id = row.category_id
        if (category === UNASSIGNED ? id !== null : id !== category)
          return false
      }

      if (group !== ANY) {
        const memberships = groupsByArticle.get(row.id)
        const inAny = Boolean(memberships && memberships.size > 0)
        if (group === UNASSIGNED ? inAny : !memberships?.has(group))
          return false
      }

      if (!term) return true
      return (
        row.title.toLowerCase().includes(term) ||
        row.slug.toLowerCase().includes(term) ||
        // Searching an author's name should find work they co-wrote, not only
        // the articles they lead.
        (row.authors ?? []).some((person) =>
          (person.name ?? '').toLowerCase().includes(term)
        ) ||
        (row.author_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, author, status, category, group, groupsByArticle, search])

  // The Author column only exists for an editor browsing everyone's work, so a
  // sort left over from that view falls back rather than sorting invisibly.
  const showAuthor = isEditor && author === ANY
  const activeSort = sort.key === 'author' && !showAuthor ? DEFAULT_SORT : sort

  const sorted = useMemo(() => {
    const factor = activeSort.dir === 'asc' ? 1 : -1
    // The rows arrive newest-first and sort is stable, so ties keep breaking by
    // how recently the article was touched.
    return [...visible].sort((a, b) => {
      const left = sortValue(a, activeSort.key)
      const right = sortValue(b, activeSort.key)
      if (typeof left === 'number' && typeof right === 'number')
        return (left - right) * factor
      // An article with no author or category sits at the bottom either way --
      // flipping the arrow should not fill the top of the table with dashes.
      if (!left || !right) return left ? -1 : right ? 1 : 0
      return (
        String(left).localeCompare(String(right), undefined, {
          sensitivity: 'base',
          numeric: true
        }) * factor
      )
    })
  }, [visible, activeSort])

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: FIRST_DIR[key] }
    )

  // Every count is taken over the whole loaded list rather than the filtered
  // one, so a dropdown shows what choosing it would find, not what is left
  // after the choice already in force.
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: rows.length }
    const byAuthor: Record<string, number> = {}
    const byCategory: Record<string, number> = { [UNASSIGNED]: 0 }
    const byGroup: Record<string, number> = { [UNASSIGNED]: 0 }

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1

      // A co-written article counts once for every name on the byline, the
      // same way it appears under any of their filters.
      for (const id of bylineIds(row)) byAuthor[id] = (byAuthor[id] ?? 0) + 1

      const categoryKey = row.category_id ?? UNASSIGNED
      byCategory[categoryKey] = (byCategory[categoryKey] ?? 0) + 1

      const memberships = groupsByArticle.get(row.id)
      if (!memberships || memberships.size === 0) byGroup[UNASSIGNED] += 1
      // An article in two groups counts once in each, the same way it appears
      // under either filter.
      else for (const id of memberships) byGroup[id] = (byGroup[id] ?? 0) + 1
    }

    return {
      status: byStatus,
      author: byAuthor,
      category: byCategory,
      group: byGroup
    }
  }, [rows, groupsByArticle])

  // Every contributor gets an entry, plus anyone whose name is on a loaded
  // article but no longer in the contributor list -- a deactivated account's
  // work would otherwise be impossible to filter to. The signed-in user leads
  // the list, since "my articles" is the choice made most often.
  const authorOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const person of contributors)
      byId.set(person.id, person.display_name ?? 'Unnamed author')
    for (const row of rows)
      for (const person of row.authors ?? [])
        if (!byId.has(person.id))
          byId.set(person.id, person.name ?? 'Unnamed author')

    const options = [...byId].map(([id, name]) => ({ id, name }))
    options.sort((a, b) => {
      if (a.id === user?.id) return -1
      if (b.id === user?.id) return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    return options
  }, [contributors, rows, user?.id])

  const selectedIds = useMemo(() => [...selected], [selected])
  const allVisibleSelected =
    sorted.length > 0 && sorted.every((row) => selected.has(row.id))
  const someVisibleSelected =
    !allVisibleSelected && sorted.some((row) => selected.has(row.id))

  const toggleRow = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Header checkbox works on what is in view. A selection made under an
  // earlier filter survives, which is what makes "filter, select, filter,
  // select, edit once" possible.
  const toggleAllVisible = () =>
    setSelected((current) => {
      const next = new Set(current)
      for (const row of sorted) {
        if (allVisibleSelected) next.delete(row.id)
        else next.add(row.id)
      }
      return next
    })

  const handleStatusChange = async (row: ArticleRow, next: ArticleStatus) => {
    setBusyId(row.id)
    setError(null)
    try {
      await setArticleStatus(row.id, next)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setBusyId(null)
    }
  }

  const handleTrash = async () => {
    if (!pendingTrash) return
    setBusyId(pendingTrash.id)
    try {
      await trashArticle(pendingTrash.id)
      setPendingTrash(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not trash article')
      setPendingTrash(null)
    } finally {
      setBusyId(null)
    }
  }

  // One place for every bulk action: run it, drop the selection so a second
  // click cannot repeat an edit that has already landed, then reload.
  const runBulk = async (action: () => Promise<void>, failure: string) => {
    if (selectedIds.length === 0) return
    setBulkBusy(true)
    setError(null)
    try {
      await action()
      setSelected(new Set())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : failure)
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkCategory = (value: string) => {
    if (!value) return
    void runBulk(
      () =>
        setArticlesCategory(selectedIds, value === UNASSIGNED ? null : value),
      'Could not change the category'
    )
  }

  const handleBulkStatus = (value: string) => {
    if (!value) return
    void runBulk(
      () => setArticlesStatus(selectedIds, value as ArticleStatus),
      'Could not update status'
    )
  }

  const handleBulkTrash = () =>
    runBulk(
      () => trashArticles(selectedIds),
      'Could not trash the articles'
    ).finally(() => setBulkTrashOpen(false))

  // Writers submit for review; only editors publish, and the trigger would
  // reject the batch rather than let the option through.
  const bulkStatuses = (Object.keys(STATUS_LABELS) as ArticleStatus[]).filter(
    (key) => isEditor || key === 'draft' || key === 'in_review'
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditor
              ? 'Every article on the site, from every author.'
              : 'Articles you have written.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/admin/articles/trash')}>
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Trash
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/articles/new')}
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
            New article
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {isEditor && (
            <div className="w-52">
              <Select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                aria-label="Filter by author"
              >
                <option value={ANY}>
                  All authors ({authorOptions.length})
                </option>
                {authorOptions.map((person) => (
                  <option key={person.id} value={person.id}>
                    {`${person.name}${person.id === user?.id ? ' (me)' : ''} (${
                      counts.author[person.id] ?? 0
                    })`}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="w-36">
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ArticleStatus | 'all')
              }
              aria-label="Filter by status"
            >
              <option value="all">All ({counts.status.all ?? 0})</option>
              {(Object.keys(STATUS_LABELS) as ArticleStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]} ({counts.status[key] ?? 0})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value={ANY}>All categories</option>
              <option value={UNASSIGNED}>
                No category ({counts.category[UNASSIGNED] ?? 0})
              </option>
              {categories.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({counts.category[row.id] ?? 0})
                </option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              aria-label="Filter by group"
            >
              <option value={ANY}>All groups</option>
              <option value={UNASSIGNED}>
                No group ({counts.group[UNASSIGNED] ?? 0})
              </option>
              {groups.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} ({counts.group[row.id] ?? 0})
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-48 flex-1">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug or author…"
            />
          </div>
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="mb-4 border-brand-200 p-3 ring-brand-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedIds.length} selected
            </span>

            <div className="w-52">
              <Select
                value=""
                disabled={bulkBusy}
                onChange={(e) => handleBulkCategory(e.target.value)}
                aria-label="Set the category on the selected articles"
              >
                <option value="">Set category…</option>
                <option value={UNASSIGNED}>No category</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-44">
              <Select
                value=""
                disabled={bulkBusy}
                onChange={(e) => handleBulkStatus(e.target.value)}
                aria-label="Set the status on the selected articles"
              >
                <option value="">Set status…</option>
                {bulkStatuses.map((key) => (
                  <option key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              variant="danger"
              disabled={bulkBusy}
              onClick={() => setBulkTrashOpen(true)}
            >
              Trash
            </Button>

            <Button
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <LoadingBlock label="Loading articles…" />
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? 'No articles yet'
                : 'Nothing matches those filters'
            }
            description={
              rows.length === 0
                ? 'Write your first article and it will appear here.'
                : 'Try clearing the search or widening one of the filters.'
            }
            action={
              rows.length === 0 ? (
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/articles/new')}
                >
                  New article
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="w-10 px-4 py-3">
                    <SelectAllCheckbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      disabled={bulkBusy}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <SortHeader
                    label="Title"
                    sortKey="title"
                    sort={activeSort}
                    onSort={toggleSort}
                  />
                  {showAuthor && (
                    <SortHeader
                      label="Author"
                      sortKey="author"
                      sort={activeSort}
                      onSort={toggleSort}
                    />
                  )}
                  <SortHeader
                    label="Category"
                    sortKey="category"
                    sort={activeSort}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    label="Status"
                    sortKey="status"
                    sort={activeSort}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    label="Updated"
                    sortKey="updated"
                    sort={activeSort}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((row) => {
                  const checked = selected.has(row.id)
                  return (
                    <tr
                      key={row.id}
                      className={classNames(
                        checked ? 'bg-brand-50/60' : 'hover:bg-gray-50',
                        (busyId === row.id || (bulkBusy && checked)) &&
                          'opacity-50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className={CHECKBOX_CLASS}
                          checked={checked}
                          disabled={bulkBusy}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Select ${row.title}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/articles/${row.id}`}
                          className="font-medium text-gray-900 hover:text-brand-600"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          /{row.slug}
                        </p>
                      </td>
                      {showAuthor && (
                        <td className="px-4 py-3 text-gray-600">
                          {row.author_name ?? '—'}
                          {(row.authors ?? []).length > 1 && (
                            <span
                              className="ml-1 text-xs text-gray-400"
                              title={(row.authors ?? [])
                                .map((person) => person.name)
                                .join(', ')}
                            >
                              +{row.authors.length - 1}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-600">
                        {row.category_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {parseDate(
                          row.updated_at.slice(0, 10)
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {row.status === 'published' && (
                            <a
                              href={`/article/${row.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-gray-500 hover:text-gray-900"
                            >
                              View
                            </a>
                          )}
                          {isEditor && row.status !== 'published' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row, 'published')
                              }
                              className="text-xs font-medium text-green-700 hover:text-green-900"
                            >
                              Publish
                            </button>
                          )}
                          {!isEditor && row.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(row, 'in_review')
                              }
                              className="text-xs font-medium text-amber-700 hover:text-amber-900"
                            >
                              Submit
                            </button>
                          )}
                          <Link
                            to={`/admin/articles/${row.id}`}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPendingTrash(row)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Trash
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(pendingTrash)}
        title="Move to trash"
        onClose={() => setPendingTrash(null)}
        footer={
          <>
            <Button onClick={() => setPendingTrash(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleTrash}
              loading={busyId === pendingTrash?.id}
            >
              Move to trash
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Move <strong className="text-gray-900">{pendingTrash?.title}</strong>{' '}
          to the trash?
          {pendingTrash?.status === 'published' &&
            ' It comes off the site straight away.'}{' '}
          Nothing is deleted — its votes and tags are kept, and you can restore
          it from{' '}
          <Link
            to="/admin/articles/trash"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Trash
          </Link>
          .
        </p>
      </Modal>

      <Modal
        open={bulkTrashOpen}
        title="Move to trash"
        onClose={() => setBulkTrashOpen(false)}
        footer={
          <>
            <Button onClick={() => setBulkTrashOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleBulkTrash}
              loading={bulkBusy}
            >
              Move {selectedIds.length} to trash
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Move{' '}
          <strong className="text-gray-900">
            {selectedIds.length} article{selectedIds.length === 1 ? '' : 's'}
          </strong>{' '}
          to the trash? Anything published comes off the site straight away.
          Nothing is deleted — votes, tags and group placements are kept, and
          you can restore them from{' '}
          <Link
            to="/admin/articles/trash"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Trash
          </Link>
          .
        </p>
      </Modal>
    </div>
  )
}
