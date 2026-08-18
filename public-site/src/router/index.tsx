import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import PageLayout from 'components/layout/PageLayout'
import RouteError from 'components/layout/RouteError'
import RequireRole from 'components/admin/RequireRole'
import { LoadingBlock } from 'components/admin/ui'
import HomePage from 'pages/Home'
import RandomPage from 'pages/Random'
import LatestPage from 'pages/Latest'
import CategoriesPage from 'pages/Categories'
import TagsPage from 'pages/Tags'
import ArticlePage from 'pages/Article'
import CategoryPage from 'pages/Category'
import TagPage from 'pages/Tag'
import AuthorPage from 'pages/Author'
import SearchPage from 'pages/Search'
import AboutPage from 'pages/About'
import SupportPage from 'pages/Support'
import ValidationProcessPage from 'pages/ValidationProcess'
import NotFoundPage from 'pages/NotFound'
import LoginPage from 'pages/Login'
import SignupPage from 'pages/Signup'
import ResetPasswordPage from 'pages/ResetPassword'
import UpdatePasswordPage from 'pages/UpdatePassword'
import AccountPage from 'pages/Account'
import EmailConfirmedPage from 'pages/EmailConfirmed'
import TermsPage from 'pages/Terms'
import GroupPage from 'pages/Group'
import ChangelogPage from 'pages/Changelog'
import { lazyWithRetry } from './lazyWithRetry'

// The CMS pulls in TipTap, ProseMirror and turndown -- several hundred KB that
// a reader should never download. Lazy-loading keeps all of it in its own
// chunk, fetched only when someone actually opens /admin. lazyWithRetry rather
// than plain lazy so a deploy mid-session does not strand an open tab on a
// chunk hash that no longer exists.
const AdminLayout = lazyWithRetry(() => import('components/admin/AdminLayout'))
const AdminDashboardPage = lazyWithRetry(() => import('pages/admin/Dashboard'))
const AdminArticlesPage = lazyWithRetry(() => import('pages/admin/Articles'))
const ArticleEditorPage = lazyWithRetry(
  () => import('pages/admin/ArticleEditor')
)
const AdminArticleTrashPage = lazyWithRetry(
  () => import('pages/admin/ArticleTrash')
)
const AdminGroupsPage = lazyWithRetry(() => import('pages/admin/Groups'))
const GroupEditorPage = lazyWithRetry(() => import('pages/admin/GroupEditor'))
const AdminUsersPage = lazyWithRetry(() => import('pages/admin/Users'))
const AdminTaxonomyPage = lazyWithRetry(() => import('pages/admin/Taxonomy'))
const AdminProfilePage = lazyWithRetry(() => import('pages/admin/Profile'))
const NoAccessPage = lazyWithRetry(() => import('pages/admin/NoAccess'))
const ArticlePreviewPage = lazyWithRetry(
  () => import('pages/admin/ArticlePreview')
)

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
}

/**
 * Groups used to be courses, and /course/<slug> links are out in the world.
 * The slug did not change, so the group page can serve them -- a redirect
 * rather than a second copy of the page.
 *
 * Client-side, so it is a 200 and a replace rather than a 301. Good enough for
 * a reader following an old link; if the old URLs need to pass their search
 * ranking on, that wants a `_redirects` rule at the edge instead.
 */
function CourseRedirect() {
  const { slug } = useParams<{ slug: string }>()
  return <Navigate to={`/group/${slug}`} replace />
}

export const router = createBrowserRouter([
  {
    path: '/admin/no-access',
    element: (
      <Lazy>
        <NoAccessPage />
      </Lazy>
    ),
    errorElement: <RouteError />
  },
  // Outside the /admin branch on purpose: the preview opens in its own tab and
  // wears the public site's chrome, not the CMS shell.
  {
    path: '/admin/article-preview',
    element: (
      <Lazy>
        <RequireRole minimum="writer">
          <ArticlePreviewPage />
        </RequireRole>
      </Lazy>
    ),
    errorElement: <RouteError />
  },
  {
    path: '/admin',
    element: (
      <Lazy>
        <RequireRole minimum="writer">
          <AdminLayout />
        </RequireRole>
      </Lazy>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <Lazy>
            <AdminDashboardPage />
          </Lazy>
        )
      },
      {
        path: 'articles',
        element: (
          <Lazy>
            <AdminArticlesPage />
          </Lazy>
        )
      },
      // Ahead of `articles/:id` so the intent is obvious at a glance, though
      // the router would rank the static segment first either way.
      {
        path: 'articles/trash',
        element: (
          <Lazy>
            <AdminArticleTrashPage />
          </Lazy>
        )
      },
      {
        path: 'articles/:id',
        element: (
          <Lazy>
            <ArticleEditorPage />
          </Lazy>
        )
      },
      // Groups are staff-managed -- "Staff manage groups" in the schema --
      // so the route mirrors the policy rather than relying on the nav to
      // hide it.
      {
        path: 'groups',
        element: (
          <Lazy>
            <RequireRole minimum="editor">
              <AdminGroupsPage />
            </RequireRole>
          </Lazy>
        )
      },
      {
        path: 'groups/:id',
        element: (
          <Lazy>
            <RequireRole minimum="editor">
              <GroupEditorPage />
            </RequireRole>
          </Lazy>
        )
      },
      {
        path: 'taxonomy',
        element: (
          <Lazy>
            <RequireRole minimum="editor">
              <AdminTaxonomyPage />
            </RequireRole>
          </Lazy>
        )
      },
      {
        path: 'users',
        element: (
          <Lazy>
            <RequireRole minimum="admin">
              <AdminUsersPage />
            </RequireRole>
          </Lazy>
        )
      },
      {
        path: 'profile',
        element: (
          <Lazy>
            <AdminProfilePage />
          </Lazy>
        )
      }
    ]
  },
  {
    path: '/',
    element: <PageLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'random',
        element: <RandomPage />
      },
      {
        path: 'latest',
        element: <LatestPage />
      },
      {
        path: 'categories',
        element: <CategoriesPage />
      },
      {
        path: 'tags',
        element: <TagsPage />
      },
      {
        path: 'article/:slug',
        element: <ArticlePage />
      },
      {
        path: 'category/:slug',
        element: <CategoryPage />
      },
      {
        path: 'tag/:slug',
        element: <TagPage />
      },
      {
        path: 'author/:slug',
        element: <AuthorPage />
      },
      {
        path: 'group/:slug',
        element: <GroupPage />
      },
      {
        path: 'course/:slug',
        element: <CourseRedirect />
      },
      {
        path: 'search',
        element: <SearchPage />
      },
      {
        path: 'about',
        element: <AboutPage />
      },
      {
        path: 'support',
        element: <SupportPage />
      },
      {
        path: 'validation-process',
        element: <ValidationProcessPage />
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'signup',
        element: <SignupPage />
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />
      },
      {
        path: 'update-password',
        element: <UpdatePasswordPage />
      },
      {
        path: 'account',
        element: <AccountPage />
      },
      {
        path: 'email-confirmed',
        element: <EmailConfirmedPage />
      },
      {
        path: 'terms',
        element: <TermsPage />
      },
      {
        path: 'changelog',
        element: <ChangelogPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
])
