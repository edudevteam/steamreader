import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import PageLayout from 'components/layout/PageLayout'
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
import CoursePage from 'pages/Course'
import ChangelogPage from 'pages/Changelog'

// The CMS pulls in TipTap, ProseMirror and turndown -- several hundred KB that
// a reader should never download. Lazy-loading keeps all of it in its own
// chunk, fetched only when someone actually opens /admin.
const AdminLayout = lazy(() => import('components/admin/AdminLayout'))
const AdminDashboardPage = lazy(() => import('pages/admin/Dashboard'))
const AdminArticlesPage = lazy(() => import('pages/admin/Articles'))
const ArticleEditorPage = lazy(() => import('pages/admin/ArticleEditor'))
const AdminUsersPage = lazy(() => import('pages/admin/Users'))
const AdminTaxonomyPage = lazy(() => import('pages/admin/Taxonomy'))
const AdminProfilePage = lazy(() => import('pages/admin/Profile'))
const NoAccessPage = lazy(() => import('pages/admin/NoAccess'))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/admin/no-access',
    element: (
      <Lazy>
        <NoAccessPage />
      </Lazy>
    )
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
      {
        path: 'articles/:id',
        element: (
          <Lazy>
            <ArticleEditorPage />
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
        path: 'course/:slug',
        element: <CoursePage />
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
