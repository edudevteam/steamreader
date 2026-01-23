import { Link } from 'react-router-dom'
import tagsData from 'data/tags.json'
import type { Tag } from 'types'

const tags = tagsData.tags as Tag[]

export default function TagsPage() {
  // Sort tags by article count (most popular first)
  const sortedTags = [...tags].sort((a, b) => b.articleCount - a.articleCount)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
        <p className="mt-2 text-gray-600">Explore articles by topic</p>
      </header>

      {sortedTags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {sortedTags.map((tag) => (
            <Link
              key={tag.slug}
              to={`/tag/${tag.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-100 hover:text-brand-700"
            >
              <span>#{tag.name}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                {tag.articleCount}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No tags available yet.</p>
        </div>
      )}
    </div>
  )
}
