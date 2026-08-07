import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  htmlToMarkdown,
  renderArticleContent,
  renderForEditor
} from './markdown'

const CONTENT_DIR = path.join(__dirname, '../../../md-articles/content')
const DATA_DIR = path.join(__dirname, '../data/articles')

/** Parses HTML without building a live document, so embeds do not load. */
function parseInert(html: string): HTMLTemplateElement {
  const template = document.createElement('template')
  template.innerHTML = html
  return template
}

/** Reads a markdown article, returning its body and matching built JSON. */
async function loadPair(slug: string) {
  const files = await readdir(CONTENT_DIR)
  const file = files.find(
    (f) => f.replace(/^\d{4}-\d{2}-\d{2}-/, '') === `${slug}.md`
  )
  if (!file) throw new Error(`No markdown for ${slug}`)

  const raw = await readFile(path.join(CONTENT_DIR, file), 'utf-8')
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
  const built = JSON.parse(
    await readFile(path.join(DATA_DIR, `${slug}.json`), 'utf-8')
  )

  return { body, built }
}

describe('CMS markdown pipeline', () => {
  /**
   * The whole design rests on this: an article saved from the CMS must render
   * exactly like one built from a markdown file, or publishing through the new
   * editor would silently rewrite every existing article's HTML.
   */
  it('reproduces the build pipeline output for a real article', async () => {
    const { body, built } = await loadPair('python-venv')
    const rendered = renderArticleContent(body, built.excerpt)

    expect(rendered.html).toBe(built.content)
    expect(rendered.tableOfContents).toEqual(built.tableOfContents)
    expect(rendered.readingTime).toBe(built.readingTime)
  })

  it('matches the build pipeline on an article with embeds and figures', async () => {
    const { body, built } = await loadPair('tinkercad-circuits-lesson-2')
    const rendered = renderArticleContent(body, built.excerpt)

    expect(rendered.html).toBe(built.content)
    expect(rendered.tableOfContents).toEqual(built.tableOfContents)
  })

  /**
   * Stands in for TipTap's RawHtmlBlock parse step: <figure> and <iframe>
   * become an atom node that serialises as div[data-raw-html]. Simulating it
   * here lets the round trip be tested without booting ProseMirror.
   */
  function asEditorOutput(editorHtml: string): string {
    const template = parseInert(editorHtml)

    template.content.querySelectorAll('figure, iframe').forEach((element) => {
      const marker = document.createElement('div')
      marker.setAttribute('data-raw-html', element.outerHTML)
      element.replaceWith(marker)
    })

    return template.innerHTML
  }

  /**
   * Reduces HTML to what a browser would actually render, so the round trip is
   * judged on reader-visible output rather than on bytes.
   *
   * Passing a document through a DOM normalises three things that any WYSIWYG
   * inevitably changes and no reader can see:
   *   - `&Omega;` becomes the literal Ω
   *   - `allowfullscreen` becomes `allowfullscreen=""`
   *   - a soft line break inside a list item becomes a space
   *
   * Whitespace inside <pre> is preserved, because indentation in a code sample
   * is real content -- corruption there must still fail the test.
   */
  function normalizeHtml(html: string): string {
    return parseInert(html)
      .innerHTML.split(/(<pre[\s\S]*?<\/pre>)/)
      .map((part, index) =>
        index % 2 === 1 ? part : part.replace(/\s+/g, ' ')
      )
      .join('')
      .trim()
  }

  describe('opening an article in the visual editor and saving it back', () => {
    /**
     * The failure this guards against is the expensive one: a writer opens an
     * existing article, changes nothing, hits save, and the stored HTML comes
     * back different -- reformatted, or with embeds stripped.
     */
    it.each(['python-venv', 'tinkercad-circuits-lesson-2', 'python-fast-api'])(
      'leaves %s unchanged',
      async (slug) => {
        const { body, built } = await loadPair(slug)

        const fromEditor = asEditorOutput(renderForEditor(body))
        const savedMarkdown = htmlToMarkdown(fromEditor)

        const before = renderArticleContent(body, built.excerpt)
        const after = renderArticleContent(savedMarkdown, built.excerpt)

        expect(after.tableOfContents).toEqual(before.tableOfContents)
        expect(normalizeHtml(after.html)).toBe(normalizeHtml(before.html))
      }
    )
  })

  describe('WYSIWYG round trip', () => {
    it('preserves headings, lists, links and emphasis', () => {
      const source = [
        '## Getting Started',
        '',
        'A paragraph with **bold**, _italic_ and `code`.',
        '',
        '- First item',
        '- Second item',
        '',
        '[A link](https://example.com)'
      ].join('\n')

      const roundTripped = htmlToMarkdown(renderForEditor(source))

      expect(roundTripped).toContain('## Getting Started')
      expect(roundTripped).toContain('**bold**')
      expect(roundTripped).toContain('_italic_')
      expect(roundTripped).toContain('`code`')
      expect(roundTripped).toContain('- First item')
      expect(roundTripped).toContain('[A link](https://example.com)')
    })

    it('preserves fenced code blocks and their language', () => {
      const source = '```bash\npython --version\n```'
      const roundTripped = htmlToMarkdown(renderForEditor(source))

      expect(roundTripped).toContain('```bash')
      expect(roundTripped).toContain('python --version')
    })

    it('keeps inline styled spans that the articles rely on', () => {
      const source = 'Bricks are <span style="color:red;">red</span> today.'
      const roundTripped = htmlToMarkdown(renderForEditor(source))

      expect(roundTripped).toContain('<span style="color:red;">red</span>')
    })

    it('restores embeds the editor held verbatim', () => {
      // TipTap parses <figure> and <iframe> into a RawHtmlBlock atom, which
      // serialises as this marker div. Turndown must hand back the original
      // markup untouched, or every save would strip the article's embeds.
      const original =
        '<iframe width="560" height="315" src="https://example.com/embed/abc"></iframe>'
      const fromEditor = `<p>Before</p><div data-raw-html="${original.replace(
        /"/g,
        '&quot;'
      )}"></div><p>After</p>`

      const roundTripped = htmlToMarkdown(fromEditor)

      expect(roundTripped).toContain(original)
      expect(roundTripped).toContain('Before')
      expect(roundTripped).toContain('After')
    })

    it('keeps nested lists indented correctly', () => {
      const source = [
        '- Outer',
        '  - Inner one',
        '  - Inner two',
        '- Second'
      ].join('\n')

      const roundTripped = htmlToMarkdown(renderForEditor(source))

      // Re-rendering must produce the same structure, not a flattened list.
      expect(renderForEditor(roundTripped)).toBe(renderForEditor(source))
    })

    it('numbers ordered lists from their start attribute', () => {
      const source = '2. Second step\n3. Third step'
      const roundTripped = htmlToMarkdown(renderForEditor(source))

      expect(roundTripped).toContain('2. Second step')
      expect(roundTripped).toContain('3. Third step')
    })

    it('does not let highlight markup leak into the editor source', () => {
      // renderForEditor must skip highlight.js, or hljs spans would be
      // turned into literal text on the next save.
      const editorHtml = renderForEditor('```bash\necho hi\n```')

      expect(editorHtml).not.toContain('hljs')
    })
  })
})
