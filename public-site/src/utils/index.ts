export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

export function filterPublishedArticles<T extends { publishedAt: string }>(articles: T[]): T[] {
  const now = new Date()
  return articles.filter((article) => new Date(article.publishedAt) <= now)
}
