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

/**
 * Renders a byline as prose: "Ada", "Ada and Alan", "Ada, Alan and Grace".
 *
 * Card layouts have no room for three linked names, so they use this while the
 * article page links each author individually.
 */
export function formatByline(authors: { name: string }[]): string {
  const names = authors.map((author) => author.name).filter(Boolean)
  if (names.length === 0) return 'Unknown'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
