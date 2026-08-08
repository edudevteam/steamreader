import { Node, mergeAttributes } from '@tiptap/core'

/**
 * A call-to-action button: a styled anchor the author can drop inline.
 *
 * Markdown is the source of truth for article bodies, so the button has to
 * survive the editor -> markdown -> editor round trip untouched. It is an
 * *inline* atom for exactly that reason: turndown emits the anchor verbatim
 * inside its paragraph, marked passes inline HTML straight through, and the
 * `a[data-button]` parse rule picks it back up. Nothing about the shape of the
 * document changes on the way round.
 *
 * Every visual choice is written as an inline style rather than a class,
 * because the published HTML is dropped into a `prose` container with no
 * stylesheet of its own -- inline wins over the typography plugin's `a` rules.
 */

export interface ArticleButtonAttributes {
  label: string
  href: string
  background: string
  color: string
  radius: string
}

export const DEFAULT_ARTICLE_BUTTON: ArticleButtonAttributes = {
  label: 'Learn more',
  href: '',
  background: '#673ab7',
  color: '#ffffff',
  radius: '8px'
}

export const BUTTON_RADIUS_PRESETS: { label: string; value: string }[] = [
  { label: 'Square', value: '0px' },
  { label: 'Subtle', value: '4px' },
  { label: 'Rounded', value: '8px' },
  { label: 'Soft', value: '16px' },
  { label: 'Pill', value: '9999px' }
]

// ------------------------------------------------------------- sanitisers
//
// These values end up in HTML that is published with `dangerouslySetInnerHTML`,
// so they are validated on the way in *and* on the way out: a hand-edited
// markdown source is just as much an input as the dialog is.

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const CSS_LENGTH = /^\d{1,5}(?:\.\d+)?(?:px|rem|em|%)$/
const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel'])

export function safeColor(value: unknown, fallback: string): string {
  const candidate = String(value ?? '').trim()
  return HEX_COLOR.test(candidate) ? candidate.toLowerCase() : fallback
}

export function safeRadius(value: unknown): string {
  const candidate = String(value ?? '').trim()
  return CSS_LENGTH.test(candidate) ? candidate : DEFAULT_ARTICLE_BUTTON.radius
}

export function safeHref(value: unknown): string {
  const candidate = String(value ?? '').trim()
  if (!candidate) return ''

  const scheme = URL_SCHEME.exec(candidate)
  // No scheme means a relative path, an anchor or a bare domain -- all fine.
  if (!scheme) return candidate

  return SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? candidate : ''
}

export function normalizeArticleButton(
  attributes: Partial<ArticleButtonAttributes>
): ArticleButtonAttributes {
  return {
    label:
      String(attributes.label ?? '').trim() || DEFAULT_ARTICLE_BUTTON.label,
    href: safeHref(attributes.href),
    background: safeColor(
      attributes.background,
      DEFAULT_ARTICLE_BUTTON.background
    ),
    color: safeColor(attributes.color, DEFAULT_ARTICLE_BUTTON.color),
    radius: safeRadius(attributes.radius)
  }
}

/**
 * Reads one declaration out of a `style` attribute.
 *
 * Deliberately the raw attribute string rather than `element.style`, which
 * normalises `#673ab7` to `rgb(103, 58, 183)` -- the dialog's colour inputs
 * need the hex back exactly as it was written.
 */
function styleValue(element: HTMLElement, property: string): string {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(
    element.getAttribute('style') ?? ''
  )

  return match ? match[1].trim() : ''
}

export function articleButtonStyle(
  attributes: ArticleButtonAttributes
): string {
  return [
    'display:inline-block',
    `background-color:${attributes.background}`,
    `color:${attributes.color}`,
    `border-radius:${attributes.radius}`,
    'padding:0.625rem 1.25rem',
    'text-decoration:none'
  ].join(';')
}

/**
 * The label's weight, kept off the anchor deliberately.
 *
 * TipTap's Bold mark parses a bare `font-weight: 600` *style* rule, so putting
 * it on the anchor made the parser wrap every button in `<strong>` the moment
 * the markdown was read back in -- the round trip grew a pair of `**` on each
 * save. Marks are read from the element being matched and the parser never
 * descends into a leaf node, so a nested span is invisible to that rule.
 */
export const BUTTON_LABEL_STYLE = 'font-weight:600'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleButton: {
      setArticleButton: (
        attributes: Partial<ArticleButtonAttributes>
      ) => ReturnType
      updateArticleButton: (
        attributes: Partial<ArticleButtonAttributes>
      ) => ReturnType
      unsetArticleButton: () => ReturnType
    }
  }
}

export const ArticleButton = Node.create({
  name: 'articleButton',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: DEFAULT_ARTICLE_BUTTON.label,
        parseHTML: (element) =>
          element.textContent?.trim() || DEFAULT_ARTICLE_BUTTON.label,
        // Rendered as the anchor's text, not as an attribute.
        renderHTML: () => ({})
      },
      href: {
        default: DEFAULT_ARTICLE_BUTTON.href,
        parseHTML: (element) => safeHref(element.getAttribute('href')),
        renderHTML: (attributes) => {
          const href = safeHref(attributes.href)
          return href ? { href } : {}
        }
      },
      background: {
        default: DEFAULT_ARTICLE_BUTTON.background,
        parseHTML: (element) =>
          safeColor(
            styleValue(element, 'background-color'),
            DEFAULT_ARTICLE_BUTTON.background
          ),
        renderHTML: () => ({})
      },
      color: {
        default: DEFAULT_ARTICLE_BUTTON.color,
        parseHTML: (element) =>
          safeColor(styleValue(element, 'color'), DEFAULT_ARTICLE_BUTTON.color),
        renderHTML: () => ({})
      },
      radius: {
        default: DEFAULT_ARTICLE_BUTTON.radius,
        parseHTML: (element) =>
          safeRadius(styleValue(element, 'border-radius')),
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    // Above the default 50 so this beats StarterKit's Link mark, whose
    // `a[href]` rule would otherwise claim any button that links somewhere.
    return [{ tag: 'a[data-button]', priority: 100 }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attributes = normalizeArticleButton(
      node.attrs as Partial<ArticleButtonAttributes>
    )

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-button': 'true',
        class: 'article-button',
        style: articleButtonStyle(attributes)
      }),
      ['span', { style: BUTTON_LABEL_STYLE }, attributes.label]
    ]
  },

  renderText({ node }) {
    return String(node.attrs.label ?? '')
  },

  addCommands() {
    return {
      setArticleButton:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: normalizeArticleButton(attributes)
          }),

      updateArticleButton:
        (attributes) =>
        ({ commands }) =>
          commands.updateAttributes(
            this.name,
            normalizeArticleButton(attributes)
          ),

      unsetArticleButton:
        () =>
        ({ commands }) =>
          commands.deleteSelection()
    }
  }
})

export default ArticleButton
