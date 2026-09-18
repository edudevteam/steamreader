/**
 * Turns the content store into the files the public site reads.
 *
 * This is where the old database views went: the joins, the published-only
 * filter and the counts all happen once, here, at publish time, so a reader
 * downloads finished JSON and nothing else. The output shapes are the public
 * site's own types, defined in public-site/src/types and read by
 * public-site/src/lib/content.ts.
 *
 * Only live articles leave this machine. Drafts, articles in review, archived
 * articles and the trash are filtered out before anything is serialised.
 */
import { stripInlineMarkdown } from '../../public-site/src/utils'
import type {
  Article,
  ArticleMeta,
  ArticlesIndex,
  AuthorRef,
  FeatureImage,
  GroupMeta
} from '../../public-site/src/types'
import type { SiteData } from '../../public-site/src/lib/content'
import type { Content, StoredArticle } from './store'

/** R2 key -> JSON document. Keys are relative to the bucket root. */
export type PublicFiles = Map<string, unknown>

export const DATA_PREFIX = 'data/'

const EMPTY_IMAGE: FeatureImage = { src: '', alt: '' }

export function isLive(article: StoredArticle): boolean {
  return article.status === 'published' && !article.deleted_at
}

export function buildPublicFiles(content: Content): PublicFiles {
  const authorsById = new Map(content.authors.map((a) => [a.id, a]))
  const categoriesById = new Map(content.categories.map((c) => [c.id, c]))
  const tagsById = new Map(content.tags.map((t) => [t.id, t]))
  const groupCategoriesById = new Map(
    content.groupCategories.map((c) => [c.id, c])
  )

  const live = content.articles
    .filter(isLive)
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    )
  const liveBySlug = new Map(live.map((a) => [a.slug, a]))
  const liveById = new Map(live.map((a) => [a.id, a]))

  function byline(article: StoredArticle): AuthorRef[] {
    const refs = article.author_ids
      .map((id) => authorsById.get(id))
      .filter(Boolean)
      .map((a) => ({ slug: a!.slug, name: a!.name }))
    // Bylines never render blank, even for an article with no author left.
    return refs.length > 0 ? refs : [{ slug: '', name: 'Unknown' }]
  }

  function toMeta(article: StoredArticle): ArticleMeta {
    const authors = byline(article)
    const category = article.category_id
      ? categoriesById.get(article.category_id)
      : undefined

    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle ?? undefined,
      excerpt: article.excerpt,
      author: authors[0],
      authors,
      publishedAt: article.published_at ?? article.created_at,
      updatedAt: article.updated_at,
      category: category
        ? { slug: category.slug, name: category.name }
        : { slug: 'uncategorized', name: 'Uncategorized' },
      tags: article.tag_ids
        .map((id) => tagsById.get(id))
        .filter(Boolean)
        .map((t) => ({ slug: t!.slug, name: t!.name })),
      featureImage: article.feature_image?.src
        ? article.feature_image
        : EMPTY_IMAGE,
      readingTime: article.reading_time,
      status: article.status,
      validation: article.validation ?? undefined
    }
  }

  function neighbour(slug: string | null) {
    const target = slug ? liveBySlug.get(slug) : undefined
    return target ? { slug: target.slug, title: target.title } : undefined
  }

  const files: PublicFiles = new Map()
  const metas = live.map(toMeta)

  const index: ArticlesIndex = {
    articles: metas,
    totalCount: metas.length,
    lastUpdated: live[0]?.updated_at ?? new Date(0).toISOString()
  }
  files.set(`${DATA_PREFIX}articles/index.json`, index)

  live.forEach((article, i) => {
    const full: Article = {
      ...metas[i],
      previousArticle: neighbour(article.previous_slug),
      nextArticle: neighbour(article.next_slug),
      content: article.content_html,
      tableOfContents: (article.toc ?? []).map((item) => ({
        ...item,
        text: stripInlineMarkdown(item.text)
      }))
    }
    files.set(`${DATA_PREFIX}articles/${article.slug}.json`, full)
  })

  // ------------------------------------------------------------ site.json

  const count = <K>(keys: K[]) =>
    keys.reduce(
      (map, key) => map.set(key, (map.get(key) ?? 0) + 1),
      new Map<K, number>()
    )

  const perCategory = count(live.map((a) => a.category_id))
  const perTag = count(live.flatMap((a) => a.tag_ids))
  const perAuthor = count(live.flatMap((a) => a.author_ids))

  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name)

  const groups: GroupMeta[] = [...content.groups]
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
    )
    .map((group) => {
      const category = group.category_id
        ? groupCategoriesById.get(group.category_id)
        : undefined
      return {
        slug: group.slug,
        title: group.title,
        description: group.description,
        featureImage: group.feature_image?.src
          ? { src: group.feature_image.src, alt: group.feature_image.alt }
          : { src: '', alt: group.title },
        category: category
          ? { slug: category.slug, name: category.name }
          : null,
        // A lesson that is not live yet is left out, exactly as readers never
        // saw a draft lesson before.
        articles: group.article_ids
          .map((id) => liveById.get(id)?.slug)
          .filter((slug): slug is string => Boolean(slug))
      }
    })

  const site: SiteData = {
    categories: [...content.categories]
      .sort((a, b) => a.sort_order - b.sort_order || byName(a, b))
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description ?? undefined,
        color: c.color ?? undefined,
        articleCount: perCategory.get(c.id) ?? 0
      })),
    tags: content.tags
      .filter((t) => perTag.has(t.id))
      .map((t) => ({
        slug: t.slug,
        name: t.name,
        articleCount: perTag.get(t.id)!
      }))
      .sort(byName),
    authors: content.authors
      .filter((a) => perAuthor.has(a.id))
      .map((a) => ({
        slug: a.slug,
        name: a.name,
        bio: a.bio ?? undefined,
        avatar: a.avatar_url ?? undefined,
        social: a.social ?? undefined,
        articleCount: perAuthor.get(a.id)!
      }))
      .sort(byName),
    groups,
    layouts: content.layouts
  }
  files.set(`${DATA_PREFIX}site.json`, site)

  return files
}
