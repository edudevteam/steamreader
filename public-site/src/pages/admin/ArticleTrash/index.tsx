/**
 * The article trash.
 *
 * Two actions, deliberately asymmetric: Restore is a plain button, Destroy
 * goes through a confirm and names the article, because it is the one place in
 * the CMS where content actually leaves.
 *
 * Visibility is not enforced here. The `article_trash` view already scopes
 * rows to the accounts that can act on them -- the primary author, and staff --
 * so anything this page lists is something the signed-in user may restore.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  destroyArticle,
  listTrashedArticles,
  restoreArticle
} from 'lib/cms/articles'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Modal,
  StatusBadge
} from 'components/admin/ui'
import { classNames } from 'utils'
import type { ArticleTrashRow } from 'types'

/** "3 days ago" reads better than a date for something you may be about to undo. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

export default function AdminArticleTrashPage() {
  const [rows, setRows] = useState<ArticleTrashRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDestroy, setPendingDestroy] = useState<ArticleTrashRow | null>(
    null
  )
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listTrashedArticles())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the trash')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleRestore = async (row: ArticleTrashRow) => {
    setBusyId(row.id)
    setError(null)
    try {
      await restoreArticle(row.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore article')
    } finally {
      setBusyId(null)
    }
  }

  const handleDestroy = async () => {
    if (!pendingDestroy) return
    setBusyId(pendingDestroy.id)
    try {
      await destroyArticle(pendingDestroy.id)
      setPendingDestroy(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete article')
      setPendingDestroy(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          to="/admin/articles"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Articles
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Trash</h1>
        <p className="mt-1 text-sm text-gray-500">
          Trashed articles are off the site but nothing has been deleted —
          restore one and it comes back with its votes, tags and byline intact.
          The trash is never emptied automatically.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Card>
        {loading ? (
          <LoadingBlock label="Loading the trash…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="The trash is empty"
            description="Articles you move to the trash show up here until you restore or delete them."
            action={
              <Link to="/admin/articles">
                <Button>Back to articles</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Was</th>
                  <th className="px-4 py-3 font-medium">Trashed</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={classNames(
                      'hover:bg-gray-50',
                      busyId === row.id && 'opacity-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {row.title}
                      </span>
                      <p className="mt-0.5 font-mono text-xs text-gray-400">
                        /{row.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.author_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {timeAgo(row.deleted_at)}
                      {row.deleted_by_name && (
                        <span className="block text-xs text-gray-400">
                          by {row.deleted_by_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRestore(row)}
                          disabled={busyId === row.id}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDestroy(row)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Delete forever
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
        open={Boolean(pendingDestroy)}
        title="Delete forever"
        onClose={() => setPendingDestroy(null)}
        footer={
          <>
            <Button onClick={() => setPendingDestroy(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDestroy}
              loading={busyId === pendingDestroy?.id}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Permanently delete{' '}
          <strong className="text-gray-900">{pendingDestroy?.title}</strong>?
          This removes the article and every vote it has earned. There is no
          undo, and no second trash.
        </p>
      </Modal>
    </div>
  )
}
