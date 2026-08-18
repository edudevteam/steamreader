/**
 * The front page.
 *
 * Its arrangement is data, not code: `site_settings.home_layout` holds an
 * ordered list of sections, edited in the Designer under /admin/designer.
 * Until someone saves there, `DEFAULT_HOME_LAYOUT` renders the page the site
 * shipped with, so this file has no opinion about what is on it.
 */
import ContentState from 'components/ContentState'
import PageSections from 'components/page/PageSections'
import {
  useArticles,
  useCategories,
  useGroups,
  usePageLayout
} from 'hooks/useContent'

export default function HomePage() {
  const { data: articles, loading, error, reload } = useArticles()
  const { data: categories } = useCategories()
  const { data: groups } = useGroups()
  // No loading state of its own: the hook falls back to the default layout,
  // which is a real page rather than a blank one.
  const { data: layout } = usePageLayout('home')

  return (
    <ContentState loading={loading} error={error} onRetry={reload}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSections
          layout={layout}
          articles={articles}
          categories={categories}
          groups={groups}
        />
      </div>
    </ContentState>
  )
}
