export function classNames(...classes: unknown[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Parses a publish date into an instant.
 *
 * A bare YYYY-MM-DD is read as local midnight rather than UTC midnight, which
 * fixes the off-by-one-day bug from `new Date("YYYY-MM-DD")`. A full timestamp
 * already carries its offset, so it is passed through untouched — appending a
 * time to one produced an Invalid Date, and truncating it to a UTC date hid
 * evening-published articles until the next local midnight.
 */
export function parseDate(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr)
}

/**
 * Renders an instant as the `YYYY-MM-DDTHH:mm` a `datetime-local` input wants.
 *
 * That input reads and writes local wall time, so slicing the stored ISO string
 * showed UTC in a local field: every open shifted the time by the offset, and
 * every save wrote the shift back.
 */
export function toDateTimeLocal(iso: string): string {
  const date = parseDate(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export function filterPublishedArticles<T extends { publishedAt: string }>(
  articles: T[]
): T[] {
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
