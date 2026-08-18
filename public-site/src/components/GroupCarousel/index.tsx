import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GroupMeta } from 'types'

interface GroupCarouselProps {
  groups: GroupMeta[]
  title: string
  subtitle?: string
  count?: number
  limit?: number
  /**
   * What each card calls itself. Defaults to the group's own category name, so
   * a mixed list labels itself correctly; pass it when a section wants one
   * word for every card -- the Courses section says "Course", singular, rather
   * than repeating the category's plural name.
   */
  badge?: string
}

export default function GroupCarousel({
  groups,
  title,
  subtitle,
  count = 3,
  limit,
  badge
}: GroupCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const limitedGroups = limit ? groups.slice(0, limit) : groups
  const totalPages = Math.ceil(limitedGroups.length / count)
  const paginatedGroups = limitedGroups.slice(
    currentPage * count,
    (currentPage + 1) * count
  )

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -scrollRef.current.offsetWidth * 0.85,
        behavior: 'smooth'
      })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: scrollRef.current.offsetWidth * 0.85,
        behavior: 'smooth'
      })
    }
  }

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  if (limitedGroups.length === 0) return null

  const cardClasses =
    'group overflow-hidden rounded-xl border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-white shadow-md transition-all hover:border-teal-200 hover:shadow-lg'

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>

      {/* Mobile Carousel */}
      <div className="relative md:hidden">
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
          aria-label="Scroll left"
        >
          <svg
            className="size-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-8 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {limitedGroups.map((group) => (
            <Link
              key={group.slug}
              to={`/group/${group.slug}`}
              className={`w-[85vw] shrink-0 snap-center ${cardClasses}`}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={group.featureImage.src}
                  alt={group.featureImage.alt}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">
                    {badge ?? group.category?.name ?? 'Group'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {group.articles.length} lesson
                    {group.articles.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-teal-600">
                  {group.title}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">
                  {group.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
          aria-label="Scroll right"
        >
          <svg
            className="size-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:block">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedGroups.map((group) => (
            <Link
              key={group.slug}
              to={`/group/${group.slug}`}
              className={cardClasses}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={group.featureImage.src}
                  alt={group.featureImage.alt}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">
                    {badge ?? group.category?.name ?? 'Group'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {group.articles.length} lesson
                    {group.articles.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-teal-600">
                  {group.title}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">
                  {group.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              &larr; Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`size-2 rounded-full transition-colors ${
                    i === currentPage
                      ? 'bg-teal-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-600 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
