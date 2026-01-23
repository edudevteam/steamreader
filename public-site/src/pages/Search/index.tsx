import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import articlesData from 'data/articles.json'
import categoriesData from 'data/categories.json'
import type { ArticleMeta } from 'types'
import { filterPublishedArticles } from 'utils'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])
const categories = categoriesData.categories

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || ''

  const [query, setQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)

  const results = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()

    let filtered = articles

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((a) => a.category.slug === selectedCategory)
    }

    // Filter by search query
    if (normalizedQuery) {
      filtered = filtered.filter((article) => {
        const searchableText = [
          article.title,
          article.subtitle || '',
          article.excerpt,
          article.author.name,
          article.category.name,
          ...article.tags.map((t) => t.name)
        ]
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedQuery)
      })
    }

    return filtered
  }, [query, selectedCategory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedCategory) params.set('category', selectedCategory)
    setSearchParams(params)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Header */}
      <header className="mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, category, or tags..."
              className="w-full rounded-full border border-gray-300 bg-white px-5 py-3 pl-12 text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-full bg-purple-700 px-6 py-2 font-medium text-white transition-colors hover:bg-purple-800"
            >
              Search
            </button>

            {(query || selectedCategory) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSelectedCategory('')
                  setSearchParams(new URLSearchParams())
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </form>
      </header>

      {/* Results */}
      <section>
        <div className="mb-4 text-sm text-gray-500">
          {results.length} result{results.length !== 1 ? 's' : ''} found
          {query && <span> for "{query}"</span>}
          {selectedCategory && (
            <span>
              {' '}
              in{' '}
              {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
            </span>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => (
              <Link
                key={article.slug}
                to={`/article/${article.slug}`}
                className="group overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={article.featureImage.src}
                    alt={article.featureImage.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      {article.category.name}
                    </span>
                    <span className="text-xs text-gray-500">{article.readingTime} min</span>
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-brand-600">
                    {article.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
                  <div className="text-xs text-gray-500">
                    {article.author.name} &#8226;{' '}
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No articles found matching your search.</p>
            <p className="mt-2 text-sm text-gray-500">
              Try different keywords or clear your filters.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
