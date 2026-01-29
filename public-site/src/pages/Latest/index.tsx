import { Link } from 'react-router-dom'
import articlesData from 'data/articles.json'
import type { ArticleMeta } from 'types'
import { filterPublishedArticles, parseDate } from 'utils'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])

// Get the latest 6 articles
const getLatestArticles = () => {
  return [...articles]
    .sort((a, b) => parseDate(b.publishedAt).getTime() - parseDate(a.publishedAt).getTime())
    .slice(0, 6)
}

export default function LatestPage() {
  const latestArticles = getLatestArticles()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Latest Articles</h1>
        <p className="mt-2 text-gray-600">The most recent articles from our writers</p>
      </header>

      {latestArticles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {latestArticles.map((article) => (
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
                  {article.author.name} &#8226; {parseDate(article.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No articles available yet.</p>
        </div>
      )}
    </div>
  )
}
