import { useState } from 'react'
import type { TocItem } from 'types'

interface TableOfContentsProps {
  items: TocItem[]
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (items.length === 0) return null

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setIsOpen(false)
    }
  }

  // Group items: H2 as top level, H3 as children
  const groupedItems = items.reduce<{ parent: TocItem; children: TocItem[] }[]>(
    (acc, item) => {
      if (item.level === 2) {
        acc.push({ parent: item, children: [] })
      } else if (item.level === 3 && acc.length > 0) {
        acc[acc.length - 1].children.push(item)
      }
      return acc
    },
    []
  )

  return (
    <>
      {/* Floating button + slide-out drawer (all screen sizes) */}
      <div>
        {/* Floating TOC button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open table of contents"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </button>

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Slide-out drawer */}
        <div
          className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="font-semibold text-gray-900">Contents</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close table of contents"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Drawer content */}
          <nav className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 65px)' }}>
            <ul className="space-y-1">
              {groupedItems.map(({ parent, children }) => (
                <li key={parent.id}>
                  <button
                    onClick={() => scrollToHeading(parent.id)}
                    className="w-full rounded-lg px-3 py-2 text-left font-medium text-gray-900 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    {parent.text}
                  </button>
                  {children.length > 0 && (
                    <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                      {children.map((child) => (
                        <li key={child.id}>
                          <button
                            onClick={() => scrollToHeading(child.id)}
                            className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                          >
                            {child.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
