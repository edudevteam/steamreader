import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArticles } from 'lib/cms/articles'
import { getPublishStatus } from 'lib/cms/publish'
import { Card, LoadingBlock, StatusBadge } from 'components/admin/ui'
import type { ArticleRow, ArticleStatus } from 'types'

function StatTile({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<ArticleRow[]>([])
  const [unpublished, setUnpublished] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listArticles()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
    getPublishStatus()
      .then((status) =>
        setUnpublished(status.upload.length + status.remove.length)
      )
      .catch(() => setUnpublished(null))
  }, [])

  const stats = useMemo(() => {
    const tally = (status: ArticleStatus) =>
      rows.filter((row) => row.status === status).length
    return {
      published: tally('published'),
      drafts: tally('draft'),
      inReview: tally('in_review')
    }
  }, [rows])

  const recent = useMemo(() => rows.slice(0, 6), [rows])

  const queue = useMemo(
    () => rows.filter((row) => row.status === 'in_review'),
    [rows]
  )

  if (loading) return <LoadingBlock label="Loading dashboard…" />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Everything here is saved on this computer until you publish.
          </p>
        </div>
        <Link
          to="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          New article
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Published"
          value={stats.published}
          tone="text-green-600"
        />
        <StatTile
          label="In review"
          value={stats.inReview}
          tone="text-amber-600"
        />
        <StatTile label="Drafts" value={stats.drafts} tone="text-gray-700" />
        <Link to="/admin/publish">
          <StatTile
            label="Files waiting to publish"
            value={unpublished ?? 0}
            tone="text-brand-600"
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Waiting for review
            </h2>
          </div>
          {queue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              Nothing is waiting for review.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {queue.slice(0, 6).map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <Link
                    to={`/admin/articles/${row.id}`}
                    className="truncate text-sm font-medium text-gray-900 hover:text-brand-600"
                  >
                    {row.title}
                  </Link>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recently updated
            </h2>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No articles yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/articles/${row.id}`}
                      className="block truncate text-sm font-medium text-gray-900 hover:text-brand-600"
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {row.author_name ?? 'Unassigned'} ·{' '}
                      {new Date(row.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
