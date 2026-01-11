import { createBrowserRouter } from 'react-router-dom'
import PageLayout from 'components/layout/PageLayout'
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
import NotFoundPage from 'pages/NotFound'

export const router = createBrowserRouter([
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
        path: 'search',
        element: <SearchPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
])
