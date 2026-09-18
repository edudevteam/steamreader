import { useEffect, useMemo, useRef, useState } from 'react'
import { generateSlug } from 'lib/markdown'
import { listAllTags } from 'lib/cms/articles'
import type { TagRef, TagRow } from 'types'

/** Token input with suggestions from tags already used across the site. */
export default function TagInput({
  value,
  onChange
}: {
  value: TagRef[]
  onChange: (tags: TagRef[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [known, setKnown] = useState<TagRow[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listAllTags()
      .then(setKnown)
      .catch(() => setKnown([]))
  }, [])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = useMemo(() => new Set(value.map((t) => t.slug)), [value])

  const suggestions = useMemo(() => {
    const term = draft.trim().toLowerCase()
    return known
      .filter(
        (tag) =>
          !selected.has(tag.slug) &&
          (!term || tag.name.toLowerCase().includes(term))
      )
      .slice(0, 8)
  }, [known, draft, selected])

  const addTag = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const slug = generateSlug(trimmed)
    if (!slug || selected.has(slug)) {
      setDraft('')
      return
    }

    onChange([...value, { slug, name: trimmed.toLowerCase() }])
    setDraft('')
  }

  const removeTag = (slug: string) =>
    onChange(value.filter((tag) => tag.slug !== slug))

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-brand-600">
        {value.map((tag) => (
          <span
            key={tag.slug}
            className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-1 pl-2 pr-1 text-xs font-medium text-brand-700"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.slug)}
              className="rounded p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
              aria-label={`Remove ${tag.name}`}
            >
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addTag(draft)
            } else if (
              event.key === 'Backspace' &&
              !draft &&
              value.length > 0
            ) {
              removeTag(value[value.length - 1].slug)
            }
          }}
          placeholder={value.length === 0 ? 'Add tags…' : ''}
          className="min-w-32 flex-1 border-0 bg-transparent p-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
      </div>

      {open && (suggestions.length > 0 || draft.trim()) && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
          {draft.trim() &&
            !known.some((t) => t.slug === generateSlug(draft)) && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(draft)}
                className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
              >
                Create{' '}
                <span className="font-medium">
                  {draft.trim().toLowerCase()}
                </span>
              </button>
            )}
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(tag.name)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
