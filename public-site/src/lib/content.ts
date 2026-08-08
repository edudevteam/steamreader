/**
 * Public content queries.
 *
 * Every read here goes through the `article_list` / `article_detail` views,
 * which run with `security_invoker = on`. That means RLS decides visibility:
 * anonymous visitors get published articles only, and there is no way for a
 * draft to leak just because a page forgot to filter.
 *
 * Rows are mapped back into the same `ArticleMeta` / `Article` shapes the site
 * used when content came from JSON, so the pages stay unchanged below the
 * fetch.
 */
import { supabase } from 'lib/supabase'
import { stripInlineMarkdown } from 'utils'
import type {
  Article,
  ArticleMeta,
  ArticleRow,
  ArticleDetailRow,
  Author,
  Category,
  CourseMeta,
  FeatureImage,
  Tag
} from 'types'

const FALLBACK_IMAGE: FeatureImage = { src: '', alt: '' }

function toMeta(row: ArticleRow): ArticleMeta {
  const featureImage = row.feature_image as FeatureImage

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    excerpt: row.excerpt,
    author: {
      slug: row.author_slug ?? '',
      name: row.author_name ?? 'Unknown'
    },
    // The view already sorts primary-first; map rather than re-sort. An article
    // with no author at all still needs one entry so bylines never render blank.
    authors:
      row.authors && row.authors.length > 0
        ? row.authors.map((person) => ({
            slug: person.slug ?? '',
            name: person.name ?? 'Unknown'
          }))
        : [{ slug: row.author_slug ?? '', name: row.author_name ?? 'Unknown' }],
    // Kept as a full timestamp: `parseDate` handles both shapes, and trimming
    // to a UTC date pushed anything published in the evening onto tomorrow,
    // which hid it from every published-only page until local midnight.
    publishedAt: row.published_at ?? row.created_at,
    updatedAt: row.updated_at,
    category: {
      slug: row.category_slug ?? 'uncategorized',
      name: row.category_name ?? 'Uncategorized'
    },
    tags: row.tags ?? [],
    featureImage: featureImage?.src ? featureImage : FALLBACK_IMAGE,
    readingTime: row.reading_time,
    status: row.status,
    validation: row.validation ?? undefined
  }
}

export async function fetchArticles(): Promise<ArticleMeta[]> {
  const { data, error } = await supabase
    .from('article_list')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data as ArticleRow[]).map(toMeta)
}

export async function fetchArticleBySlug(
  slug: string
): Promise<Article | null> {
  const { data, error } = await supabase
    .from('article_detail')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as ArticleDetailRow
  const article: Article = {
    ...toMeta(row),
    content: row.content_html,
    // The stored toc predates the strip in extractTableOfContents, so rows
    // published before it still carry `**bold**` in their heading text.
    tableOfContents: (row.toc ?? []).map((item) => ({
      ...item,
      text: stripInlineMarkdown(item.text)
    }))
  }

  // prev/next are stored as slugs; the reader needs titles for the nav links.
  const neighbourSlugs = [row.previous_slug, row.next_slug].filter(
    Boolean
  ) as string[]
  if (neighbourSlugs.length > 0) {
    const { data: neighbours } = await supabase
      .from('article_list')
      .select('slug, title')
      .in('slug', neighbourSlugs)

    const titleBySlug = new Map(
      (neighbours ?? []).map((n) => [n.slug, n.title])
    )

    if (row.previous_slug && titleBySlug.has(row.previous_slug)) {
      article.previousArticle = {
        slug: row.previous_slug,
        title: titleBySlug.get(row.previous_slug)!
      }
    }
    if (row.next_slug && titleBySlug.has(row.next_slug)) {
      article.nextArticle = {
        slug: row.next_slug,
        title: titleBySlug.get(row.next_slug)!
      }
    }
  }

  return article
}

export async function fetchCategories(): Promise<
  (Category & { articleCount: number })[]
> {
  const { data, error } = await supabase
    .from('category_counts')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    articleCount: Number(row.article_count) || 0
  }))
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tag_counts')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    articleCount: Number(row.article_count) || 0
  }))
}

export async function fetchAuthors(): Promise<Author[]> {
  const { data, error } = await supabase
    .from('public_authors')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    slug: row.slug ?? '',
    name: row.name ?? 'Unknown',
    bio: row.bio ?? undefined,
    avatar: row.avatar_url ?? undefined,
    social: row.social ?? undefined,
    articleCount: Number(row.article_count) || 0
  }))
}

export async function fetchCourses(): Promise<CourseMeta[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(
      'slug, title, description, feature_image, course_articles(position, articles(slug))'
    )
    .order('sort_order', { ascending: true })

  if (error) throw error

  type CourseJoin = {
    slug: string
    title: string
    description: string
    feature_image: { src: string; alt: string }
    course_articles: { position: number; articles: { slug: string } | null }[]
  }

  return ((data ?? []) as unknown as CourseJoin[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    featureImage: row.feature_image?.src
      ? row.feature_image
      : { src: '', alt: row.title },
    articles: [...(row.course_articles ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ca) => ca.articles?.slug)
      .filter(Boolean) as string[]
  }))
}

export async function searchArticles(query: string): Promise<ArticleMeta[]> {
  const { data, error } = await supabase.rpc('search_articles', { query })

  if (error) throw error
  return (data as ArticleRow[]).map(toMeta)
}
