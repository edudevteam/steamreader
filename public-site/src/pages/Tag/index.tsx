/**
 * A tag archive.
 *
 * The counterpart to the category page: `site_settings.tag_layout` holds the
 * arrangement every /tag/… page renders, and this file only works out which
 * tag is being viewed and which articles carry it.
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
  usePageLayout,
  useTags
} from 'hooks/useContent'
import { filterPublishedArticles } from 'utils'

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>()
  const {
    data: allArticles,
    loading: articlesLoading,
    error: articlesError,
    reload
  } = useArticles()
  const { data: tags, loading: tagsLoading, error: tagsError } = useTags()
  const { data: categories } = useCategories()
  const { data: groups } = useGroups()
  const { data: layout } = usePageLayout('tag')

  const articles = useMemo(
    () => filterPublishedArticles(allArticles),
    [allArticles]
  )
  const tag = tags.find((t) => t.slug === slug)
  const tagArticles = useMemo(
    () => articles.filter((a) => a.tags.some((t) => t.slug === slug)),
    [articles, slug]
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

  const archive: ArchiveContext = {
    kind: 'tag',
    name: tag.name,
    articles: tagArticles
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
