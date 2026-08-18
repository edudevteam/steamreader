import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from 'react'
import { createPortal } from 'react-dom'
import { classNames } from 'utils'

/**
 * The full-screen slideshow behind an article's image galleries.
 *
 * It upgrades markup rather than owning it: the editor writes a grid of
 * `<a data-gallery-item>` thumbnails that already work as plain links (see
 * `admin/editor/extensions/ImageGallery.ts`), and this listens for clicks on
 * them anywhere inside `containerRef`. Nothing re-renders the article body, so
 * the same component serves the reader page and the CMS preview tab.
 *
 * Paging is unbounded on purpose: the position counter runs past both ends and
 * the image is looked up modulo the set, so the last slide walks forward into
 * the first with the same animation as any other step. Only the two neighbours
 * are mounted, so a fifty-image gallery costs the same as a three-image one.
 */

interface LightboxImage {
  src: string
  alt: string
  caption: string
}

const ITEM_SELECTOR = 'a[data-gallery-item]'
const SWIPE_THRESHOLD = 48

function readItem(item: HTMLAnchorElement): LightboxImage {
  const image = item.querySelector('img')

  return {
    src: image?.getAttribute('src') ?? item.href,
    alt: image?.getAttribute('alt') ?? '',
    caption: item.getAttribute('data-caption') ?? ''
  }
}

function IconButton({
  label,
  onClick,
  className,
  children
}: {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={classNames(
        'absolute z-10 flex size-11 items-center justify-center rounded-full',
        'bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
        className
      )}
    >
      {children}
    </button>
  )
}

export default function ImageLightbox({
  containerRef
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const [images, setImages] = useState<LightboxImage[] | null>(null)
  const [position, setPosition] = useState(0)

  const dialog = useRef<HTMLDivElement>(null)
  // Whatever the reader clicked to get here, so closing puts the keyboard back
  // where it was rather than at the top of the document.
  const opener = useRef<HTMLElement | null>(null)
  const touchStart = useRef<number | null>(null)

  const open = images !== null && images.length > 0
  const count = images?.length ?? 0

  const close = useCallback(() => {
    setImages(null)
    opener.current?.focus()
    opener.current = null
  }, [])

  const move = useCallback((step: number) => {
    setPosition((current) => current + step)
  }, [])

  // Clicks on thumbnails, wherever they are in the rendered article.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onClick = (event: MouseEvent) => {
      // Modified clicks are the reader asking for a new tab or a download, and
      // the anchor already points at the full-size image.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const item = (event.target as HTMLElement | null)?.closest?.(
        ITEM_SELECTOR
      ) as HTMLAnchorElement | null
      const gallery = item?.closest('[data-image-gallery]')
      if (!item || !gallery) return

      const items = Array.from(
        gallery.querySelectorAll<HTMLAnchorElement>(ITEM_SELECTOR)
      )

      event.preventDefault()
      opener.current = item
      setImages(items.map(readItem))
      setPosition(Math.max(items.indexOf(item), 0))
    }

    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [containerRef])

  // While the slideshow is up it owns the arrow keys and the scroll position.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowLeft') move(-1)
      else if (event.key === 'ArrowRight') move(1)
      else return

      event.preventDefault()
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    dialog.current?.focus()

    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close, move])

  if (!open || !images) return null

  const at = (index: number) => images[((index % count) + count) % count]
  const current = at(position)
  // One image has nowhere to slide to, so it is mounted alone.
  const slides = count > 1 ? [position - 1, position, position + 1] : [position]

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
      tabIndex={-1}
      onClick={close}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current
        const end = event.changedTouches[0]?.clientX
        touchStart.current = null

        if (start === null || end === undefined || count < 2) return
        if (Math.abs(end - start) > SWIPE_THRESHOLD) move(end < start ? 1 : -1)
      }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm focus:outline-none"
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span aria-live="polite">
          {count > 1
            ? `${(((position % count) + count) % count) + 1} / ${count}`
            : ''}
        </span>
        <button
          type="button"
          aria-label="Close gallery"
          onClick={close}
          className="rounded-full p-2 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg
            className="size-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* The stage swallows its own clicks so only the backdrop closes. */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {slides.map((slide) => (
          <div
            key={slide}
            aria-hidden={slide !== position}
            style={{ transform: `translateX(${(slide - position) * 100}%)` }}
            className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-300 ease-out sm:p-8"
          >
            <img
              src={at(slide).src}
              alt={at(slide).alt}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
            />
          </div>
        ))}

        {count > 1 && (
          <>
            <IconButton
              label="Previous image"
              onClick={() => move(-1)}
              className="left-3 top-1/2 -translate-y-1/2"
            >
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 6l-6 6 6 6"
                />
              </svg>
            </IconButton>
            <IconButton
              label="Next image"
              onClick={() => move(1)}
              className="right-3 top-1/2 -translate-y-1/2"
            >
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6l6 6-6 6"
                />
              </svg>
            </IconButton>
          </>
        )}
      </div>

      {(current.caption || current.alt) && (
        <p
          className="px-6 pb-6 pt-3 text-center text-sm text-white/80"
          onClick={(event) => event.stopPropagation()}
        >
          {current.caption || current.alt}
        </p>
      )}
    </div>,
    document.body
  )
}
