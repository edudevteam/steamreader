/**
 * Data hooks for the public pages.
 *
 * When content lived in JSON, every page had it synchronously at module scope.
 * Now it comes over the wire, so these hooks memoise per key at module level:
 * the article index is fetched once per session and reused across Home, Latest,
 * Category, Tag, Author and Search rather than refetched on each navigation.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  fetchArticleBySlug,
  fetchArticles,
  fetchAuthors,
  fetchCategories,
  fetchCourses,
  fetchTags
} from 'lib/content'
import type {
  Article,
  ArticleMeta,
  Author,
  Category,
  CourseMeta,
  Tag
} from 'types'

type Loader<T> = () => Promise<T>

const cache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

/** Resolves from cache, joins an in-flight request, or starts a new one. */
function load<T>(key: string, loader: Loader<T>): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T)

  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const promise = loader()
    .then((value) => {
      cache.set(key, value)
      return value
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

/** Drops cached content so the next read hits the database (used after a save). */
export function invalidateContent(key?: string): void {
  if (key) {
    cache.delete(key)
    return
  }
  cache.clear()
}

export interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
  reload: () => void
}

function useCachedResource<T>(
  key: string,
  loader: Loader<T>,
  fallback: T
): AsyncState<T> {
  const [data, setData] = useState<T>(() => (cache.get(key) as T) ?? fallback)
  const [loading, setLoading] = useState(!cache.has(key))
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    (force: boolean) => {
      if (force) cache.delete(key)

      let cancelled = false
      setLoading(!cache.has(key))
      setError(null)

      load(key, loader)
        .then((value) => {
          if (!cancelled) setData(value)
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message ?? 'Failed to load content')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })

      return () => {
        cancelled = true
      }
    },
    // The loader is recreated per render by callers; the key identifies it.
    // The disable has to sit directly above the dependency array -- one line
    // higher and it lands on the closing brace, which is not where the rule
    // reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )

  useEffect(() => run(false), [run])

  const reload = useCallback(() => {
    run(true)
  }, [run])

  return { data, loading, error, reload }
}

export function useArticles(): AsyncState<ArticleMeta[]> {
  return useCachedResource('articles', fetchArticles, [])
}

export function useCategories(): AsyncState<
  (Category & { articleCount: number })[]
> {
  return useCachedResource('categories', fetchCategories, [])
}

export function useTags(): AsyncState<Tag[]> {
  return useCachedResource('tags', fetchTags, [])
}

export function useAuthors(): AsyncState<Author[]> {
  return useCachedResource('authors', fetchAuthors, [])
}

export function useCourses(): AsyncState<CourseMeta[]> {
  return useCachedResource('courses', fetchCourses, [])
}

/**
 * Single article by slug. Not cached through `useCachedResource` because the
 * body is large and readers rarely revisit the same article in one session.
 */
export function useArticle(slug: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchArticleBySlug(slug)
      .then((result) => {
        if (cancelled) return
        if (!result) setError('Article not found')
        setArticle(result)
      })
      .catch(() => {
        if (!cancelled) setError('Article not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { article, loading, error }
}
