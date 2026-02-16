import changelogData from 'data/changelog.json'
import type { ChangelogEntry } from 'types'

const changelog = changelogData as ChangelogEntry[]

const typeBadge: Record<ChangelogEntry['type'], { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-green-100 text-green-700' },
  content: { label: 'Content', className: 'bg-blue-100 text-blue-700' },
  fix: { label: 'Fix', className: 'bg-red-100 text-red-700' },
  improvement: { label: 'Improvement', className: 'bg-amber-100 text-amber-700' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Changelog</h1>
        <p className="mt-3 text-lg text-gray-600">
          A history of updates, new features, and improvements to STEAM Reader.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Subscribe via{' '}
          <a
            href="/rss.xml"
            className="font-medium text-brand-600 hover:text-brand-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            RSS feed
          </a>{' '}
          to get notified of changes.
        </p>
      </div>

      <div className="relative border-l-2 border-gray-200 pl-8">
        {changelog.map((entry) => {
          const badge = typeBadge[entry.type]
          return (
            <div key={entry.version} className="relative mb-10 last:mb-0">
              {/* Timeline dot */}
              <div className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-brand-500 bg-white" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">v{entry.version}</span>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
                <span className="text-sm text-gray-500">{formatDate(entry.date)}</span>
              </div>

              <h2 className="mt-1 text-xl font-semibold text-gray-900">{entry.title}</h2>
              <p className="mt-1 text-gray-600">{entry.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
