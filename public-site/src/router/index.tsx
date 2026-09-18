import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import PageLayout from 'components/layout/PageLayout'
import RouteError from 'components/layout/RouteError'
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
import TermsPage from 'pages/Terms'
import GroupPage from 'pages/Group'
import ChangelogPage from 'pages/Changelog'

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
