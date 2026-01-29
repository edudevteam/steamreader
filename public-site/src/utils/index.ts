export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Parses a YYYY-MM-DD date string as local time instead of UTC.
 * Fixes the off-by-one-day bug caused by `new Date("YYYY-MM-DD")` being parsed as UTC midnight.
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

export function filterPublishedArticles<T extends { publishedAt: string }>(articles: T[]): T[] {
  const now = new Date()
  return articles.filter((article) => parseDate(article.publishedAt) <= now)
}
