import { Node, mergeAttributes } from '@tiptap/core'
import type { DOMOutputSpec } from '@tiptap/pm/model'
import { safeHref } from './ArticleButton'

/**
 * A grid of thumbnails that opens a full-screen slideshow when one is clicked.
 *
 * The markup is written to work with no JavaScript at all: each thumbnail is an
 * anchor to the full-size image, so a reader with a broken bundle -- or a
 * crawler -- still gets to every picture. `ImageLightbox` upgrades that on the
 * article page by intercepting the click and sliding through the set instead.
 *
 * The images live in the markup rather than in a serialised attribute: the
 * gallery *is* a list of `<a><img></a>`, so there is nothing to keep in sync,
 * and a hand-edited markdown source stays readable. Sizing is inline for the
 * usual reason -- the reader's article body is a `prose` container with no
 * stylesheet of its own.
 */

export interface GalleryImage {
  src: string
  alt: string
  caption: string
}

/** Enough for a photo essay; past this a gallery is a scrolling hazard. */
export const MAX_GALLERY_IMAGES = 30

// ------------------------------------------------------------- sanitisers

/**
 * Image sources are narrower than link targets: `mailto:` and `tel:` are
 * meaningless in a `src`, and `data:` is how a payload gets smuggled into
 * published HTML. Everything executable is already rejected by `safeHref`,
 * which stays the one place that list is written down.
 */
export function safeImageSrc(value: unknown): string {
  const candidate = safeHref(value)
  if (!candidate) return ''

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(candidate)
  // No scheme is a path served from our own origin, which is the common case.
  if (!scheme) return candidate

  return /^https?$/i.test(scheme[1]) ? candidate : ''
}

export function normalizeGalleryImage(
  image: Partial<GalleryImage>
): GalleryImage {
  return {
    src: safeImageSrc(image.src),
    alt: String(image.alt ?? '').trim(),
    caption: String(image.caption ?? '').trim()
  }
}

export function normalizeGalleryImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return []

  return value
    .map((image) => normalizeGalleryImage(image as Partial<GalleryImage>))
    .filter((image) => image.src !== '')
    .slice(0, MAX_GALLERY_IMAGES)
}

/** Reads a gallery back out of its own markup. */
export function readGalleryImages(element: HTMLElement): GalleryImage[] {
  return normalizeGalleryImages(
    Array.from(element.querySelectorAll('img')).map((image) => ({
      src: image.getAttribute('src') ?? '',
      alt: image.getAttribute('alt') ?? '',
      // The caption belongs to the item, not the picture: it is what the
      // slideshow prints under the full-size image.
      caption: image.closest('a')?.getAttribute('data-caption') ?? ''
    }))
  )
}

// ----------------------------------------------------------------- markup

export const GALLERY_STYLE = [
  'display:grid',
  // Thumbnails reflow from four across on a wide article to two on a phone
  // without a media query, which inline styles cannot carry.
  'grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))',
  'gap:0.75rem',
  'margin:1.5rem 0',
  'list-style:none',
  'padding:0'
].join(';')

export const GALLERY_ITEM_STYLE = [
  'display:block',
  'position:relative',
  'aspect-ratio:1/1',
  'overflow:hidden',
  'border-radius:0.5rem',
  'background-color:#f3f4f6',
  'margin:0',
  'text-decoration:none',
  // The affordance for "this opens bigger", for readers who never click.
  'cursor:zoom-in'
].join(';')

export const GALLERY_IMAGE_STYLE = [
  'display:block',
  'width:100%',
  'height:100%',
  'object-fit:cover',
  'margin:0'
].join(';')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGallery: {
      setImageGallery: (images: GalleryImage[]) => ReturnType
      updateImageGallery: (images: GalleryImage[]) => ReturnType
      unsetImageGallery: () => ReturnType
    }
  }
}

export const ImageGallery = Node.create({
  name: 'imageGallery',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (element) => readGalleryImages(element),
        // Written as the gallery's own children, not as an attribute.
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-image-gallery]',
        // Above the Image extension's `img[src]` rule, which would otherwise
        // pull the thumbnails out of the gallery one by one.
        priority: 100,
        getAttrs: (node) =>
          readGalleryImages(node as HTMLElement).length > 0 ? null : false
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = normalizeGalleryImages(node.attrs.images)

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        // The count is what tells a reader skimming the markdown what this is.
        'data-image-gallery': String(images.length),
        class: 'image-gallery',
        style: GALLERY_STYLE
      }),
      ...images.map((image) => [
        'a',
        {
          href: image.src,
          'data-gallery-item': 'true',
          ...(image.caption ? { 'data-caption': image.caption } : {}),
          style: GALLERY_ITEM_STYLE
        },
        [
          'img',
          {
            src: image.src,
            alt: image.alt,
            loading: 'lazy',
            style: GALLERY_IMAGE_STYLE
          }
        ]
      ])
    ] as DOMOutputSpec
  },

  renderText({ node }) {
    return normalizeGalleryImages(node.attrs.images)
      .map((image) => image.caption || image.alt || image.src)
      .join('\n')
  },

  addCommands() {
    return {
      setImageGallery:
        (images) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { images: normalizeGalleryImages(images) }
          }),

      updateImageGallery:
        (images) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            images: normalizeGalleryImages(images)
          }),

      unsetImageGallery:
        () =>
        ({ commands }) =>
          commands.deleteSelection()
    }
  }
})

export default ImageGallery
