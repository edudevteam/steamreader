import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import { listArticles } from 'lib/cms/articles'
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
  const { profile, isEditor, user } = useAuth()
  const [rows, setRows] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listArticles()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  /** "Mine" means anything I am credited on, led or co-written. */
  const isMine = useCallback(
    (row: ArticleRow) =>
      row.author_id === user?.id ||
      (row.authors ?? []).some((person) => person.id === user?.id),
    [user?.id]
  )

  const stats = useMemo(() => {
    const tally = (status: ArticleStatus) =>
      rows.filter((row) => row.status === status).length
    return {
      published: tally('published'),
      drafts: tally('draft'),
      inReview: tally('in_review'),
      mine: rows.filter(isMine).length
    }
  }, [rows, isMine])

  const recent = useMemo(() => rows.slice(0, 6), [rows])

  // Editors get a queue of what is waiting on them; writers get their own work.
  const queue = useMemo(
    () =>
      isEditor
        ? rows.filter((row) => row.status === 'in_review')
        : rows.filter((row) => isMine(row) && row.status !== 'published'),
    [rows, isEditor, isMine]
  )

  if (loading) return <LoadingBlock label="Loading dashboard…" />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back
            {profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditor
              ? 'Here is what is happening across the site.'
              : 'Here is where your writing stands.'}
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
        <StatTile
          label="Written by me"
          value={stats.mine}
          tone="text-brand-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {isEditor ? 'Waiting for review' : 'Your work in progress'}
            </h2>
          </div>
          {queue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              {isEditor
                ? 'Nothing is waiting for review.'
                : 'No drafts in progress.'}
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
