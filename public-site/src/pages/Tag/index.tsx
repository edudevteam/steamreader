import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ContentState from 'components/ContentState'
import { useArticles, useTags } from 'hooks/useContent'
import { filterPublishedArticles, parseDate } from 'utils'

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>()
  const {
    data: allArticles,
    loading: articlesLoading,
    error: articlesError,
    reload
  } = useArticles()
  const { data: tags, loading: tagsLoading, error: tagsError } = useTags()

  const articles = useMemo(
    () => filterPublishedArticles(allArticles),
    [allArticles]
  )
  const tag = tags.find((t) => t.slug === slug)
  const tagArticles = articles.filter((a) =>
    a.tags.some((t) => t.slug === slug)
  )

  const loading = articlesLoading || tagsLoading
  const error = articlesError ?? tagsError

  if (loading || error) {
    return (
      <ContentState loading={loading} error={error} onRetry={reload}>
        {null}
      </ContentState>
    )
  }

  if (!tag) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Tag Not Found</h1>
        <p className="mb-8 text-gray-600">
          The tag you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="inline-block rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tag Header */}
      <header className="mb-8">
        <nav className="mb-4">
          <Link to="/" className="text-sm text-gray-500 hover:text-brand-600">
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm text-gray-900">Tags</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm font-medium text-brand-600">
            #{tag.name}
          </span>
        </nav>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">#{tag.name}</h1>
        <p className="text-sm text-gray-500">
          {tagArticles.length} article{tagArticles.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Articles Grid */}
      {tagArticles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tagArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/article/${article.slug}`}
              className="group overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={article.featureImage.src}
                  alt={article.featureImage.alt}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {article.category.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {article.readingTime} min
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-brand-600">
                  {article.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                  {article.excerpt}
                </p>
                <div className="text-xs text-gray-500">
                  {article.author.name} &#8226;{' '}
                  {parseDate(article.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No articles with this tag yet.</p>
        </div>
      )}
    </div>
  )
}
