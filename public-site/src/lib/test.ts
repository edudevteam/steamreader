import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, renderForEditor } from './markdown'

describe('CMS markdown pipeline', () => {
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

    it('keeps CTA buttons, their colours and their corner radius', () => {
      // Exactly what the ArticleButton node serialises. Turndown's link rule
      // would flatten this to `[Start the course](…)` and lose every style,
      // so the anchor has to come back byte-identical.
      const button =
        '<a href="https://example.com/course" data-button="true" ' +
        'class="article-button" style="display:inline-block;' +
        'background-color:#673ab7;color:#ffffff;border-radius:9999px;' +
        'padding:0.625rem 1.25rem;text-decoration:none">' +
        '<span style="font-weight:600">Start the course</span></a>'

      const roundTripped = htmlToMarkdown(`<p>${button}</p>`)

      expect(roundTripped).toBe(button)
      // And marked hands it straight back for the next editing session.
      expect(renderForEditor(roundTripped)).toContain(button)
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
