/**
 * A category archive.
 *
 * Like the front page, its arrangement is data: `site_settings.category_layout`
 * holds an ordered list of sections that every /category/… page renders. This
 * file's job is only to work out which category is being viewed and which
 * articles belong to it; the layout decides how that is presented.
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ContentState from 'components/ContentState'
import PageSections from 'components/page/PageSections'
import type { ArchiveContext } from 'components/page/PageSections'
import {
  useArticles,
  useCategories,
  useGroups,
  usePageLayout
} from 'hooks/useContent'
import { filterPublishedArticles } from 'utils'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const {
    data: allArticles,
    loading: articlesLoading,
    error: articlesError,
    reload
  } = useArticles()
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError
  } = useCategories()
  const { data: groups } = useGroups()
  const { data: layout } = usePageLayout('category')

  const articles = useMemo(
    () => filterPublishedArticles(allArticles),
    [allArticles]
  )
  const category = categories.find((c) => c.slug === slug)
  const categoryArticles = useMemo(
    () => articles.filter((a) => a.category.slug === slug),
    [articles, slug]
  )

  const loading = articlesLoading || categoriesLoading
  const error = articlesError ?? categoriesError

  if (loading || error) {
    return (
      <ContentState loading={loading} error={error} onRetry={reload}>
        {null}
      </ContentState>
    )
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Category Not Found
        </h1>
        <p className="mb-8 text-gray-600">
          The category you&apos;re looking for doesn&apos;t exist.
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

  const archive: ArchiveContext = {
    kind: 'category',
    name: category.name,
    description: category.description,
    articles: categoryArticles
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageSections
        layout={layout}
        articles={articles}
        categories={categories}
        groups={groups}
        archive={archive}
      />
    </div>
  )
}
