import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import articlesData from 'data/articles.json'
import type { ArticleMeta } from 'types'
import { filterPublishedArticles } from 'utils'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])

export default function RandomPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (articles.length > 0) {
      const randomIndex = Math.floor(Math.random() * articles.length)
      const randomArticle = articles[randomIndex]
      navigate(`/article/${randomArticle.slug}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
        <p className="text-gray-600">Finding a random article...</p>
      </div>
    </div>
  )
}
