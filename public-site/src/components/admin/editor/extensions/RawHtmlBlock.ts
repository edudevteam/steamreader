import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Holds a block of hand-written HTML verbatim.
 *
 * The existing articles embed `<figure>` captions and `<iframe>` players
 * directly in the markdown. A plain WYSIWYG would silently discard both, so
 * those elements parse into this atom node instead: the editor shows them
 * rendered but uneditable, and the exact source is handed back to turndown on
 * the way out. Nothing is lost by switching tabs.
 */
export interface RawHtmlBlockAttributes {
  html: string
}

export const RawHtmlBlock = Node.create({
  name: 'rawHtmlBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-raw-html') ?? element.outerHTML,
        renderHTML: (attributes) => ({ 'data-raw-html': attributes.html })
      }
    }
  },

  parseHTML() {
    return [
      // Round trip: what this node itself renders.
      { tag: 'div[data-raw-html]' },
      // First load: raw markup coming out of the markdown renderer.
      {
        tag: 'figure',
        getAttrs: (node) => ({ html: (node as HTMLElement).outerHTML })
      },
      {
        tag: 'iframe',
        getAttrs: (node) => ({ html: (node as HTMLElement).outerHTML })
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = 'raw-html-block'
      dom.setAttribute('data-raw-html', node.attrs.html)
      dom.contentEditable = 'false'

      const label = document.createElement('div')
      label.className = 'raw-html-block__label'
      label.textContent = 'Embedded HTML — edit in the Markdown tab'

      const body = document.createElement('div')
      body.className = 'raw-html-block__body'
      body.innerHTML = node.attrs.html

      dom.append(label, body)

      return { dom }
    }
  }
})

export default RawHtmlBlock
