import { Link } from 'react-router-dom'
import categoriesData from 'data/categories.json'
import articlesData from 'data/articles.json'
import type { Category, ArticleMeta } from 'types'

const categories = categoriesData.categories as Category[]
const articles = articlesData.articles as ArticleMeta[]

// Calculate article count for each category
const getArticleCount = (slug: string) =>
  articles.filter((a) => a.category.slug === slug).length

// Define colors for each category
const categoryColors: Record<string, string> = {
  tutorial: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  science: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  technology: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  engineering: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  arts: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
  mathematics: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
}

const defaultColor = 'bg-gray-100 text-gray-700 hover:bg-gray-200'

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <p className="mt-2 text-gray-600">Browse articles by subject area</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const articleCount = getArticleCount(category.slug)
          return (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className={`rounded-xl p-6 transition-colors ${categoryColors[category.slug] || defaultColor}`}
            >
              <h2 className="text-xl font-semibold">{category.name}</h2>
              {category.description && (
                <p className="mt-2 text-sm opacity-80">{category.description}</p>
              )}
              <p className="mt-3 text-sm font-medium">
                {articleCount} article{articleCount !== 1 ? 's' : ''}
              </p>
            </Link>
          )
        })}
      </div>

      {categories.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No categories available yet.</p>
        </div>
      )}
    </div>
  )
}
