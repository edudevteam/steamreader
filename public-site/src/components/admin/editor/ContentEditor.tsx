import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { createLowlight, common } from 'lowlight'
import { classNames } from 'utils'
import {
  PREVIEW_PATH,
  PREVIEW_WINDOW_NAME,
  writeArticlePreview
} from 'lib/cms/preview'
import { htmlToMarkdown, renderForEditor } from 'lib/markdown'
import EditorToolbar from './EditorToolbar'
import ArticleButton from './extensions/ArticleButton'
import ImageGallery from './extensions/ImageGallery'
import RawHtmlBlock from './extensions/RawHtmlBlock'
import VideoEmbed from './extensions/VideoEmbed'
import { Alert } from '../ui'
import type { FeatureImage } from 'types'

const lowlight = createLowlight(common)

type Tab = 'visual' | 'markdown'

const TABS: { id: Tab; label: string }[] = [
  { id: 'visual', label: 'Visual' },
  { id: 'markdown', label: 'Markdown' }
]

interface ContentEditorProps {
  /** Markdown source -- the single source of truth for the article body. */
  value: string
  onChange: (markdown: string) => void
  excerpt: string
  /** Header fields, so the preview tab shows the whole article, not just body. */
  title: string
  subtitle: string
  featureImage: FeatureImage
}

export default function ContentEditor({
  value,
  onChange,
  excerpt,
  title,
  subtitle,
  featureImage
}: ContentEditorProps) {
  const [tab, setTab] = useState<Tab>('visual')
  const [error, setError] = useState<string | null>(null)

  /**
   * Markdown the visual editor most recently produced. Without this, the
   * round trip (editor -> markdown -> parent state -> editor) would reset the
   * document on every keystroke and throw the cursor to the top.
   */
  const emitted = useRef<string | null>(null)

  /** Lets the preview tab exercise the reader's gallery slideshow. */

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Replaced below with the highlighting variant.
        codeBlock: false,
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true }
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ inline: false, allowBase64: false }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ArticleButton,
      ImageGallery,
      VideoEmbed,
      RawHtmlBlock,
      Placeholder.configure({ placeholder: 'Start writing your article…' })
    ],
    content: renderForEditor(value),
    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[28rem] px-5 py-4'
      }
    },
    onUpdate: ({ editor: instance }) => {
      const markdown = htmlToMarkdown(instance.getHTML())
      emitted.current = markdown
      onChange(markdown)
    }
  })

  // Pull external changes (markdown tab edits, loading a different article)
  // into the visual editor, but never echo our own output back into it.
  useEffect(() => {
    if (!editor || tab !== 'visual') return
    if (value === emitted.current) return

    editor.commands.setContent(renderForEditor(value), { emitUpdate: false })
    emitted.current = value
  }, [editor, value, tab])

  // Latest field values, read by the snapshot writers below without making
  // either of them re-run on every keystroke.
  const snapshot = useRef({ value, excerpt, title, subtitle, featureImage })
  snapshot.current = { value, excerpt, title, subtitle, featureImage }

  const takeSnapshot = () => {
    const current = snapshot.current
    writeArticlePreview({
      title: current.title,
      subtitle: current.subtitle,
      excerpt: current.excerpt,
      markdown: current.value,
      featureImage: current.featureImage
    })
  }

  /** Set once the writer has opened the preview tab this session. */
  const previewOpened = useRef(false)

  // Keep an open preview tab in step with the editor. Debounced because every
  // write fires a `storage` event there, which re-renders the whole article.
  useEffect(() => {
    if (!previewOpened.current) return
    const timer = setTimeout(takeSnapshot, 500)
    return () => clearTimeout(timer)
  }, [value, excerpt, title, subtitle, featureImage])

  const openPreview = () => {
    takeSnapshot()
    previewOpened.current = true
    window.open(PREVIEW_PATH, PREVIEW_WINDOW_NAME)?.focus()
  }

  const wordCount = useMemo(
    () => value.trim().split(/\s+/).filter(Boolean).length,
    [value]
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg bg-gray-100 p-1"
            role="tablist"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={classNames(
                  'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                  tab === item.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openPreview}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Preview
            <svg
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5h5m0 0v5m0-5l-7 7M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"
              />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {wordCount.toLocaleString()} words · {Math.ceil(wordCount / 200)} min
          read
        </p>
      </div>

      {error && (
        <div className="mb-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="overflow-hidden rounded-lg ring-1 ring-gray-300">
        {tab === 'visual' && editor && (
          <>
            <EditorToolbar editor={editor} onError={setError} />
            {/* The body scrolls on its own so the toolbar stays reachable
                however long the article gets. */}
            <div className="max-h-[60vh] overflow-y-auto">
              <EditorContent editor={editor} />
            </div>
          </>
        )}

        {tab === 'markdown' && (
          <textarea
            value={value}
            onChange={(event) => {
              emitted.current = null
              onChange(event.target.value)
            }}
            spellCheck={false}
            className="block min-h-[32rem] w-full resize-y border-0 px-5 py-4 font-mono text-sm leading-relaxed text-gray-900 focus:ring-0"
            placeholder="# Your article in markdown…"
          />
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Markdown is the source of truth. The visual editor keeps embedded
        <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 font-mono">
          figure
        </code>
        and
        <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 font-mono">
          iframe
        </code>
        blocks intact — edit those in the Markdown tab.
      </p>
    </div>
  )
}
