import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, renderForEditor } from 'lib/markdown'
import ArticleButton, { safeColor, safeHref, safeRadius } from './ArticleButton'

/**
 * Loads markdown into a real editor and saves it back out, exactly as the CMS
 * does when a writer opens an article and hits save.
 *
 * The extension list mirrors ContentEditor's, because the failures worth
 * catching here come from *other* extensions claiming the button: Bold parses
 * a bare `font-weight` style, Color parses a bare `color`, and StarterKit's
 * Link matches any `a[href]`.
 */
function throughEditor(markdown: string): string {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true }
      }),
      TextStyle,
      Color,
      ArticleButton
    ],
    content: renderForEditor(markdown)
  })

  const html = editor.getHTML()
  editor.destroy()

  return htmlToMarkdown(html)
}

/**
 * Collapses the whitespace a DOM adds when it re-serialises a style attribute
 * (`a:b;c:d` comes back as `a: b; c: d;`). Browsers hand back what was set and
 * happy-dom does not, and no reader can tell the difference either way.
 */
function normalize(markdown: string): string {
  return markdown.replace(
    /style="([^"]*)"/g,
    (_, style: string) =>
      `style="${style.replace(/\s*([:;])\s*/g, '$1').replace(/;$/, '')}"`
  )
}

const BUTTON =
  '<a href="https://example.com/course" data-button="true" ' +
  'class="article-button" style="display:inline-block;' +
  'background-color:#673ab7;color:#ffffff;border-radius:9999px;' +
  'padding:0.625rem 1.25rem;text-decoration:none">' +
  '<span style="font-weight:600">Start the course</span></a>'

describe('ArticleButton', () => {
  it('survives a full editor round trip unchanged', () => {
    // Opening an article and saving it without touching anything must not
    // rewrite the button, or every save churns the markdown.
    const saved = throughEditor(BUTTON)

    expect(normalize(saved)).toBe(BUTTON)
    expect(throughEditor(saved)).toBe(saved)
  })

  it('is not claimed by the link, bold or colour extensions', () => {
    const saved = throughEditor(BUTTON)

    // A plain markdown link, a `**` wrapper or a styled span around the anchor
    // would each mean another extension parsed the button's own markup.
    expect(saved).not.toContain('[Start the course]')
    expect(saved).not.toContain('**')
    expect(saved).not.toContain('<span style="color')
    expect(saved.startsWith('<a ')).toBe(true)
    expect(saved.endsWith('</a>')).toBe(true)
  })

  it('keeps surrounding prose intact', () => {
    const saved = throughEditor(`Ready to begin? ${BUTTON} It takes an hour.`)

    expect(normalize(saved)).toBe(`Ready to begin? ${BUTTON} It takes an hour.`)
  })

  it('falls back to defaults when the markdown holds junk values', () => {
    const tampered =
      '<a href="javascript:alert(1)" data-button="true" ' +
      'style="background-color:not-a-colour;color:#fff;border-radius:huge">' +
      'Click</a>'

    const saved = normalize(throughEditor(tampered))

    expect(saved).not.toContain('javascript:')
    expect(saved).not.toContain('href=')
    expect(saved).toContain('background-color:#673ab7')
    expect(saved).toContain('border-radius:8px')
    // The author's own valid choices are still respected.
    expect(saved).toContain('color:#fff;')
    expect(saved).toContain('>Click</span></a>')
  })

  /**
   * A button saved from a real browser, not from happy-dom.
   *
   * ProseMirror applies the node's `style` spec via `cssText`, so Chrome and
   * Safari hand the colours back as `rgb()`. That is the form the markdown
   * actually holds, and reading it must give the author's colour back rather
   * than the default purple.
   */
  it('reads back a button whose colours a browser normalised to rgb()', () => {
    const saved = normalize(
      throughEditor(
        '<a href="https://portal.fundedyouth.org/" data-button="true" ' +
          'class="article-button" style="display: inline-block; ' +
          'background-color: rgb(248, 139, 37); color: rgb(255, 255, 255); ' +
          'border-radius: 4px; padding: 0.625rem 1.25rem; ' +
          'text-decoration: none;"><span style="font-weight: 600;">' +
          'FundedYouth Portal</span></a>'
      )
    )

    expect(saved).toContain('background-color:#f88b25')
    expect(saved).toContain('color:#ffffff')
    expect(saved).toContain('border-radius:4px')
  })

  describe('value sanitising', () => {
    it('accepts hex colours and rejects anything else', () => {
      expect(safeColor('#ABCDEF', '#000000')).toBe('#abcdef')
      expect(safeColor('#fff', '#000000')).toBe('#fff')
      expect(safeColor('red; content:url(x)', '#000000')).toBe('#000000')
    })

    it('accepts the rgb() form browsers normalise inline styles to', () => {
      expect(safeColor('rgb(103, 58, 183)', '#000000')).toBe('#673ab7')
      expect(safeColor('rgb(248 139 37)', '#000000')).toBe('#f88b25')
      expect(safeColor('rgba(0, 0, 0, 0.5)', '#ffffff')).toBe('#00000080')
      expect(safeColor('rgb(0 0 0 / 100%)', '#ffffff')).toBe('#000000')
      expect(safeColor('rgb(1, 2)', '#000000')).toBe('#000000')
      expect(safeColor('rgb(nope, 2, 3)', '#000000')).toBe('#000000')
    })

    it('accepts css lengths for the corner radius', () => {
      expect(safeRadius('9999px')).toBe('9999px')
      expect(safeRadius('50%')).toBe('50%')
      expect(safeRadius('1e9px')).toBe('8px')
    })

    it('allows navigable urls and drops executable schemes', () => {
      expect(safeHref('https://example.com')).toBe('https://example.com')
      expect(safeHref('/articles/intro')).toBe('/articles/intro')
      expect(safeHref('mailto:hi@example.com')).toBe('mailto:hi@example.com')
      expect(safeHref('javascript:alert(1)')).toBe('')
      expect(safeHref('data:text/html,<script>')).toBe('')
    })
  })
})
