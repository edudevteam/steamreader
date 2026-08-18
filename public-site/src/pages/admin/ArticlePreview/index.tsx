import { useEffect, useMemo, useRef, useState } from 'react'
import { useCodeBlockCopyButtons } from 'hooks/useCodeBlockCopyButtons'
import ImageLightbox from 'components/ImageLightbox'
import Header from 'components/layout/Header'
import Footer from 'components/layout/Footer'
import TableOfContents from 'components/TableOfContents'
import { renderArticleContent } from 'lib/markdown'
import {
  PREVIEW_STORAGE_KEY,
  readArticlePreview,
  type ArticlePreviewSnapshot
} from 'lib/cms/preview'

/**
 * Reader's-eye view of the article being edited, opened in its own tab from the
 * body editor. It renders through `renderArticleContent` -- the same pipeline
 * that produces the stored HTML -- inside the public article page's layout, so
 * what shows here is what a reader gets.
 */
export default function ArticlePreviewPage() {
  const [snapshot, setSnapshot] = useState<ArticlePreviewSnapshot | null>(() =>
    readArticlePreview()
  )
  const contentRef = useRef<HTMLDivElement>(null)

  // The editor rewrites the snapshot as you type; this tab picks each one up.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== PREVIEW_STORAGE_KEY) return
      setSnapshot(readArticlePreview())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    document.title = snapshot?.title
      ? `Preview · ${snapshot.title}`
      : 'Article preview'
  }, [snapshot?.title])

  const rendered = useMemo(
    () =>
      snapshot
        ? renderArticleContent(snapshot.markdown, snapshot.excerpt)
        : null,
    [snapshot]
  )

  useCodeBlockCopyButtons(contentRef, [rendered])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 ring-1 ring-amber-200">
        Preview — this is a draft, visible only to you. It updates as you edit.
      </div>

      <Header />

      <main className="flex-1">
        {!rendered || !snapshot ? (
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h1 className="mb-3 text-2xl font-bold text-gray-900">
              Nothing to preview yet
            </h1>
            <p className="text-gray-600">
              Open this tab with the Preview button in the article editor.
            </p>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-8">
              <p className="mb-4 text-sm text-gray-500">
                {rendered.readingTime} min read
              </p>

              <h1 className="mb-3 text-4xl font-bold text-gray-900">
                {snapshot.title || 'Untitled article'}
              </h1>

              {snapshot.subtitle && (
                <p className="text-xl text-gray-600">{snapshot.subtitle}</p>
              )}
            </header>

            {snapshot.featureImage?.src && (
              <figure className="mb-8">
                <img
                  src={snapshot.featureImage.src}
                  alt={snapshot.featureImage.alt}
                  className="w-full rounded-xl"
                />
                {snapshot.featureImage.caption && (
                  <figcaption className="mt-2 text-center text-sm text-gray-500">
                    {snapshot.featureImage.caption}
                  </figcaption>
                )}
              </figure>
            )}

            <TableOfContents items={rendered.tableOfContents} />

            <div
              ref={contentRef}
              className="prose prose-lg mx-auto"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />

            {/* Same gallery slideshow a reader gets on the live article. */}
            <ImageLightbox containerRef={contentRef} />
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}
