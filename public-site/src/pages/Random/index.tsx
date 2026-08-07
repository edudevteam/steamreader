import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArticles } from 'hooks/useContent'
import { filterPublishedArticles } from 'utils'

export default function RandomPage() {
  const navigate = useNavigate()
  const { data, loading, error } = useArticles()

  useEffect(() => {
    // Wait for the article index before picking, or every visit would bounce
    // straight to the home page.
    if (loading) return

    const articles = filterPublishedArticles(data)
    if (!error && articles.length > 0) {
      const randomArticle =
        articles[Math.floor(Math.random() * articles.length)]
      navigate(`/article/${randomArticle.slug}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate, data, loading, error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
        <p className="text-gray-600">Finding a random article...</p>
      </div>
    </div>
  )
}
