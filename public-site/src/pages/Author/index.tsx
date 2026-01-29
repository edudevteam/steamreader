import { useParams, Link } from 'react-router-dom'
import articlesData from 'data/articles.json'
import authorsData from 'data/authors.json'
import type { ArticleMeta, Author } from 'types'
import { filterPublishedArticles, parseDate } from 'utils'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])
const authors = authorsData.authors as Author[]

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>()

  const author = authors.find((a) => a.slug === slug)
  const authorArticles = articles.filter((a) => a.author.slug === slug)

  if (!author) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Author Not Found</h1>
        <p className="mb-8 text-gray-600">The author you're looking for doesn't exist.</p>
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
      {/* Author Header */}
      <header className="mb-8">
        <nav className="mb-4">
          <Link to="/" className="text-sm text-gray-500 hover:text-brand-600">
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm text-gray-900">Authors</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm font-medium text-brand-600">{author.name}</span>
        </nav>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
            {author.name.charAt(0)}
          </div>

          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{author.name}</h1>
            {author.bio && (
              <p className="mb-2 max-w-2xl text-gray-600">{author.bio}</p>
            )}
            <p className="text-sm text-gray-500">
              {authorArticles.length} article{authorArticles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      {/* Articles Grid */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          Articles by {author.name}
        </h2>

        {authorArticles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {authorArticles.map((article) => (
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
                    {parseDate(article.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No articles by this author yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}
