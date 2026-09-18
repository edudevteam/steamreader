import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import RouteError from 'components/layout/RouteError'
import { LoadingBlock } from 'components/admin/ui'
import { lazyWithRetry } from './lazyWithRetry'

// The editor pulls in TipTap, ProseMirror and turndown; the other screens
// have no use for them, so each page loads on its own.
const AdminLayout = lazyWithRetry(() => import('components/admin/AdminLayout'))
const DashboardPage = lazyWithRetry(() => import('pages/admin/Dashboard'))
const ArticlesPage = lazyWithRetry(() => import('pages/admin/Articles'))
const ArticleEditorPage = lazyWithRetry(
  () => import('pages/admin/ArticleEditor')
)
const ArticleTrashPage = lazyWithRetry(() => import('pages/admin/ArticleTrash'))
const ArticlePreviewPage = lazyWithRetry(
  () => import('pages/admin/ArticlePreview')
)
const GroupsPage = lazyWithRetry(() => import('pages/admin/Groups'))
const GroupEditorPage = lazyWithRetry(() => import('pages/admin/GroupEditor'))
const TaxonomyPage = lazyWithRetry(() => import('pages/admin/Taxonomy'))
const DesignerPage = lazyWithRetry(() => import('pages/admin/Designer'))
const AuthorsPage = lazyWithRetry(() => import('pages/admin/Authors'))
const PublishPage = lazyWithRetry(() => import('pages/admin/Publish'))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
}

const page = (path: string, element: ReactNode) => ({
  path,
  element: <Lazy>{element}</Lazy>
})

/**
 * Routes keep their /admin prefix from when the Studio lived inside the
 * public site, so the links between screens did not all have to change.
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  // Outside the /admin branch on purpose: the preview opens in its own tab and
  // wears the public site's chrome, not the Studio shell.
  {
    ...page('/admin/article-preview', <ArticlePreviewPage />),
    errorElement: <RouteError />
  },
  {
    path: '/admin',
    element: (
      <Lazy>
        <AdminLayout />
      </Lazy>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <Lazy>
            <DashboardPage />
          </Lazy>
        )
      },
      page('articles', <ArticlesPage />),
      page('articles/trash', <ArticleTrashPage />),
      page('articles/:id', <ArticleEditorPage />),
      page('groups', <GroupsPage />),
      page('groups/:id', <GroupEditorPage />),
      page('taxonomy', <TaxonomyPage />),
      page('designer', <DesignerPage />),
      page('authors', <AuthorsPage />),
      page('publish', <PublishPage />)
    ]
  },
  // Links inside a preview (the public header, an article's own links) point
  // at public routes the Studio does not have.
  { path: '*', element: <Navigate to="/admin" replace /> }
])
