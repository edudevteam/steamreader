import { useParams, Link } from 'react-router-dom'
import articlesData from 'data/articles.json'
import categoriesData from 'data/categories.json'
import type { ArticleMeta, Category } from 'types'
import { filterPublishedArticles } from 'utils'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])
const categories = categoriesData.categories as Category[]

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()

  const category = categories.find((c) => c.slug === slug)
  const categoryArticles = articles.filter((a) => a.category.slug === slug)

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Category Not Found</h1>
        <p className="mb-8 text-gray-600">The category you're looking for doesn't exist.</p>
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
      {/* Category Header */}
      <header className="mb-8">
        <nav className="mb-4">
          <Link to="/" className="text-sm text-gray-500 hover:text-indigo-600">
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm text-gray-900">Categories</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-sm font-medium text-indigo-600">{category.name}</span>
        </nav>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="text-lg text-gray-600">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {categoryArticles.length} article{categoryArticles.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Articles Grid */}
      {categoryArticles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categoryArticles.map((article) => (
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
                <div className="mb-2 text-xs text-gray-500">
                  {article.readingTime} min read
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-indigo-600">
                  {article.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
                <div className="text-xs text-gray-500">
                  {article.author.name} &#8226; {new Date(article.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No articles in this category yet.</p>
        </div>
      )}
    </div>
  )
}
