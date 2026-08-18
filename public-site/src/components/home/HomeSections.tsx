/**
 * Renders a home page layout.
 *
 * The public front page and the Front Page Designer's preview both mount this
 * with the same data, so what an admin arranges is literally what a visitor
 * gets -- there is no second rendering of the page to drift out of step.
 *
 * The one difference is `preview`: on the live site a section with nothing to
 * show renders nothing, because a reader should never see an empty shelf. In
 * the designer that would make a mis-configured section vanish while it was
 * being configured, so there it renders a placeholder saying why it is empty.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ArticleCarousel from 'components/ArticleCarousel'
import GroupCarousel from 'components/GroupCarousel'
import { classNames, filterPublishedArticles } from 'utils'
import { getRandomQuote } from './quotes'
import type {
  ArticleMeta,
  ArticlesSection,
  Category,
  GroupMeta,
  GroupsSection,
  HomeLayout,
  HomeSection,
  HomeSectionType,
  SearchSection,
  TextSection
} from 'types'

/**
 * Space above each section type, so an arbitrary order still reads as a page.
 * These are the margins the fixed layout used, kept per type rather than per
 * position -- a quote wants more air around it than a row of pills does,
 * wherever it lands.
 */
const TOP_GAP: Record<HomeSectionType, string> = {
  search: '',
  categories: 'mt-8',
  groups: 'mt-12',
  articles: 'mt-16',
  quote: 'mt-16',
  text: 'mt-16'
}

interface SectionData {
  articles: ArticleMeta[]
  categories: Category[]
  groups: GroupMeta[]
}

/** The articles one section draws, newest first. */
function selectArticles(
  section: ArticlesSection,
  articles: ArticleMeta[]
): ArticleMeta[] {
  const { mode, slug } = section.source

  const matched = articles.filter((article) => {
    switch (mode) {
      case 'tag':
        return article.tags.some((tag) => tag.slug === slug)
      case 'not-tag':
        return !article.tags.some((tag) => tag.slug === slug)
      case 'category':
        return article.category.slug === slug
      case 'all':
      default:
        return true
    }
  })

  return matched.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

/** The groups one section draws. A null category means every group. */
function selectGroups(
  section: GroupsSection,
  groups: GroupMeta[]
): GroupMeta[] {
  if (!section.categorySlug) return groups
  return groups.filter((group) => group.category?.slug === section.categorySlug)
}

// ------------------------------------------------------------- sub-sections

function SearchBar({ section }: { section: SearchSection }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={section.placeholder}
        className="w-full rounded-full border border-gray-300 bg-white px-5 py-3 pl-12 text-gray-900 transition-colors placeholder:text-gray-500 hover:border-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <svg
        className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </form>
  )
}

function CategoryPills({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/category/${category.slug}`}
          className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-100 hover:text-brand-700"
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}

function QuoteBlock() {
  // Per mounted section, so two quote blocks on one page show two quotes.
  const quote = useMemo(() => getRandomQuote(), [])

  return (
    <div className="py-8 text-center">
      <blockquote className="mx-auto max-w-3xl">
        <p className="text-lg font-light italic text-gray-700 md:text-xl">
          &ldquo;{quote.text}&rdquo;
        </p>
        <footer className="mt-4 text-xs font-medium text-brand-600">
          — {quote.author}
        </footer>
      </blockquote>
    </div>
  )
}

function TextBlock({ section }: { section: TextSection }) {
  return (
    <div
      className={classNames(
        'mx-auto max-w-3xl',
        section.align === 'center' ? 'text-center' : 'text-left'
      )}
    >
      {section.title && (
        <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
      )}
      {section.body && (
        <p className="mt-3 whitespace-pre-line text-gray-600">{section.body}</p>
      )}
    </div>
  )
}

/** Stands in for a section that would render nothing, in the designer only. */
function EmptySection({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-sm text-gray-500">{reason}</p>
    </div>
  )
}

// ------------------------------------------------------------------ section

function Section({
  section,
  data,
  preview
}: {
  section: HomeSection
  data: SectionData
  preview: boolean
}) {
  switch (section.type) {
    case 'search':
      return <SearchBar section={section} />

    case 'categories':
      if (data.categories.length === 0)
        return preview ? (
          <EmptySection label="Category pills" reason="No categories yet." />
        ) : null
      return <CategoryPills categories={data.categories} />

    case 'quote':
      return <QuoteBlock />

    case 'text':
      if (!section.title && !section.body)
        return preview ? (
          <EmptySection label="Text block" reason="No heading or body yet." />
        ) : null
      return <TextBlock section={section} />

    case 'articles': {
      const articles = selectArticles(section, data.articles)
      if (articles.length === 0)
        return preview ? (
          <EmptySection
            label={section.title || 'Articles'}
            reason="No published articles match this filter."
          />
        ) : null

      return (
        <ArticleCarousel
          articles={articles}
          title={section.title}
          subtitle={section.subtitle || undefined}
          count={section.perPage}
          limit={section.limit}
          variant={section.variant}
          viewAllLink={section.viewAllLink || undefined}
          viewAllText={section.viewAllText}
        />
      )
    }

    case 'groups': {
      const groups = selectGroups(section, data.groups)
      if (groups.length === 0)
        return preview ? (
          <EmptySection
            label={section.title || 'Groups'}
            reason="No groups in this category yet."
          />
        ) : null

      return (
        <GroupCarousel
          groups={groups}
          title={section.title}
          subtitle={section.subtitle || undefined}
          count={section.perPage}
          limit={section.limit}
          badge={section.badge || undefined}
        />
      )
    }
  }
}

export default function HomeSections({
  layout,
  articles,
  categories,
  groups,
  preview = false
}: {
  layout: HomeLayout
  articles: ArticleMeta[]
  categories: Category[]
  groups: GroupMeta[]
  preview?: boolean
}) {
  const published = useMemo(() => filterPublishedArticles(articles), [articles])

  const data: SectionData = { articles: published, categories, groups }

  // Disabled sections are dropped before the gaps are worked out, so hiding
  // one does not leave its space behind.
  const visible = layout.sections.filter((section) => section.enabled)

  return (
    <>
      {visible.map((section, index) => (
        <div
          key={section.id}
          className={index === 0 ? '' : TOP_GAP[section.type]}
        >
          <Section section={section} data={data} preview={preview} />
        </div>
      ))}
    </>
  )
}
