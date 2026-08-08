import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import { listArticles, setArticleStatus, trashArticle } from 'lib/cms/articles'
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
import type { ArticleRow, ArticleStatus } from 'types'
import { STATUS_LABELS } from 'types/cms'

type Scope = 'mine' | 'all'

export default function AdminArticlesPage() {
  const { user, isEditor } = useAuth()
  const navigate = useNavigate()

  // Writers only ever have their own articles, so the scope toggle is
  // meaningless for them -- default them straight to "mine".
  const [scope, setScope] = useState<Scope>(isEditor ? 'all' : 'mine')
  const [status, setStatus] = useState<ArticleStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingTrash, setPendingTrash] = useState<ArticleRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await listArticles({ mine: scope === 'mine', authorId: user?.id })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load articles')
    } finally {
      setLoading(false)
    }
  }, [scope, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Status and title filtering happen client-side: the list is small enough
  // that a round trip per keystroke would be slower than filtering in place.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false
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
  }, [rows, status, search])

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: rows.length }
    for (const row of rows) tally[row.status] = (tally[row.status] ?? 0) + 1
    return tally
  }, [rows])

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
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              {(['all', 'mine'] as Scope[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setScope(option)}
                  className={classNames(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    scope === option
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600'
                  )}
                >
                  {option === 'all' ? 'All authors' : 'Only mine'}
                </button>
              ))}
            </div>
          )}

          <div className="w-40">
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ArticleStatus | 'all')
              }
            >
              <option value="all">All statuses ({counts.all ?? 0})</option>
              {(Object.keys(STATUS_LABELS) as ArticleStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]} ({counts[key] ?? 0})
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
                : 'Try clearing the search or choosing a different status.'
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
                  <th className="px-4 py-3 font-medium">Title</th>
                  {isEditor && scope === 'all' && (
                    <th className="px-4 py-3 font-medium">Author</th>
                  )}
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className={classNames(
                      'hover:bg-gray-50',
                      busyId === row.id && 'opacity-50'
                    )}
                  >
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
                    {isEditor && scope === 'all' && (
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
                            onClick={() => handleStatusChange(row, 'published')}
                            className="text-xs font-medium text-green-700 hover:text-green-900"
                          >
                            Publish
                          </button>
                        )}
                        {!isEditor && row.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row, 'in_review')}
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
                ))}
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
    </div>
  )
}
