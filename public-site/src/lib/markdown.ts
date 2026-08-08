/**
 * Browser-side markdown pipeline for the CMS.
 *
 * The rules here -- heading ids, highlight classes, excerpt injection and
 * reading-time rounding -- were matched byte for byte against the markdown
 * build pipeline this CMS replaced, so articles imported from it keep
 * rendering exactly as they did. Changing any of them re-renders published
 * HTML, so treat them as fixed unless you mean to rewrite existing articles.
 */
import { Marked, type Tokens } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
// Deliberately the subpath, not the package root. `reading-time`'s index eagerly
// requires ./lib/stream, which pulls in Node's `util` and `stream` and dies in
// the browser with "util.inherits is not a function". lib/reading-time.js is the
// same pure function the root re-exports, so results are unchanged.
import readingTime from 'reading-time/lib/reading-time.js'
import slugify from 'slugify'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { TocItem } from 'types'
import { stripInlineMarkdown } from 'utils'

export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true })
}

export function generateExcerpt(content: string, length = 160): string {
  const plainText = content
    .replace(/^#+\s+.*/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  return plainText.length > length
    ? plainText.slice(0, length).trim() + '...'
    : plainText
}

/**
 * Heading ids are unaffected by the strip below -- slugify's strict mode
 * already dropped emphasis punctuation, so stripping it first produces
 * byte-identical slugs.
 */
export function extractTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const toc: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3
    const text = stripInlineMarkdown(match[2])
    toc.push({ id: generateSlug(text), text, level })
  }

  return toc
}

/**
 * Inserts the excerpt as a lead paragraph directly above the "Lesson
 * Objectives" heading, when the article has one. No-op otherwise.
 */
export function applyExcerptToContent(
  content: string,
  excerpt: string
): string {
  const lessonObjectivesRegex = /^(## .* ?Lesson Objectives)/m
  return excerpt && lessonObjectivesRegex.test(content)
    ? content.replace(lessonObjectivesRegex, `${excerpt}\n\n$1`)
    : content
}

function headingRenderer() {
  return {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = tokens
        .map((t) => (t as { text?: string }).text ?? '')
        .join('')
      return `<h${depth} id="${generateSlug(text)}">${text}</h${depth}>\n`
    }
  }
}

export interface RenderedContent {
  html: string
  tableOfContents: TocItem[]
  readingTime: number
}

/**
 * Publish-time render: heading anchors plus highlight.js markup baked in, which
 * is what gets stored in `articles.content_html` and shipped to readers.
 */
export function renderArticleContent(
  content: string,
  excerpt: string
): RenderedContent {
  const withExcerpt = applyExcerptToContent(content, excerpt)

  const marked = new Marked()
  marked.use({ renderer: headingRenderer() })
  marked.use(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      }
    })
  )

  const stats = readingTime(withExcerpt)

  return {
    html: marked.parse(withExcerpt, { async: false }) as string,
    tableOfContents: extractTableOfContents(withExcerpt),
    readingTime: Math.ceil(stats.minutes)
  }
}

/**
 * Editor-time render: no syntax highlighting, no excerpt injection.
 *
 * The WYSIWYG needs code blocks to contain plain text -- feeding it the
 * highlighted markup would let hljs `<span>`s leak into the source on the next
 * round trip. Highlighting is reapplied on save by `renderArticleContent`.
 */
export function renderForEditor(markdown: string): string {
  const marked = new Marked()
  return marked.parse(markdown, { async: false }) as string
}

let turndown: TurndownService | null = null

function getTurndown(): TurndownService {
  if (turndown) return turndown

  turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    fence: '```',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined'
  })

  turndown.use(gfm)

  // CTA buttons round trip as inline HTML. Turndown's link rule would happily
  // flatten one to `[Label](url)` and throw away every style the author picked,
  // so the anchor is handed back exactly as the editor serialised it. Custom
  // rules are consulted before the built-ins, so this wins.
  turndown.addRule('articleButton', {
    filter: (node) =>
      node.nodeName === 'A' &&
      (node as HTMLElement).hasAttribute('data-button'),
    replacement: (_content, node) => (node as HTMLElement).outerHTML
  })

  // Inline colour spans are used in the existing articles; keep them as HTML
  // rather than letting turndown drop the styling.
  turndown.addRule('styledSpan', {
    filter: (node) => node.nodeName === 'SPAN' && node.hasAttribute('style'),
    replacement: (content, node) =>
      `<span style="${(node as HTMLElement).getAttribute(
        'style'
      )}">${content}</span>`
  })

  // Turndown's default list item indents with three spaces ("-   item"). The
  // existing articles use "- item", and without this every save would rewrite
  // every list in the file, burying the real edit in whitespace churn.
  turndown.addRule('compactListItem', {
    filter: 'li',
    replacement: (content, node) => {
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, '\n  ')

      const parent = node.parentNode as HTMLElement
      let prefix = '- '

      if (parent?.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') ?? 1)
        const index = Array.prototype.indexOf.call(parent.children, node)
        prefix = `${start + index}. `
      }

      const isLast = parent?.lastElementChild === node
      return prefix + body + (isLast ? '' : '\n')
    }
  })

  // Preserve the heading ids the build pipeline generates from the text.
  turndown.addRule('headingWithId', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = Number(node.nodeName.charAt(1))
      return `\n\n${'#'.repeat(level)} ${content.trim()}\n\n`
    }
  })

  return turndown
}

// Verbatim blocks are swapped for a plain-text token before turndown runs.
//
// A turndown rule cannot do this job: the editor serialises a RawHtmlBlock as
// an empty `<div data-raw-html="…">`, and turndown classifies empty divs as
// blank nodes and discards them before any custom rule is consulted -- which
// silently stripped every figure and iframe on save. Tokenising sidesteps that
// path entirely, and works on any HTML rather than only on TipTap's output.
const RAW_TOKEN = (index: number) => `xrawhtmlblock${index}x`

function extractRawHtml(html: string): { prepared: string; blocks: string[] } {
  // A <template> parses inertly. DOMParser would build a live document, and
  // the verbatim blocks being extracted here are exactly the <iframe> embeds
  // that would then start fetching YouTube on every keystroke.
  const template = document.createElement('template')
  template.innerHTML = html

  const blocks: string[] = []

  template.content.querySelectorAll('div[data-raw-html]').forEach((element) => {
    const placeholder = document.createElement('p')
    placeholder.textContent = RAW_TOKEN(blocks.length)
    blocks.push(element.getAttribute('data-raw-html') ?? '')
    element.replaceWith(placeholder)
  })

  return { prepared: template.innerHTML, blocks }
}

function restoreRawHtml(markdown: string, blocks: string[]): string {
  return blocks.reduce(
    (result, block, index) => result.replaceAll(RAW_TOKEN(index), block),
    markdown
  )
}

/** WYSIWYG HTML -> markdown source. */
export function htmlToMarkdown(html: string): string {
  const { prepared, blocks } = extractRawHtml(html)

  const markdown = getTurndown()
    .turndown(prepared)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return restoreRawHtml(markdown, blocks)
}
