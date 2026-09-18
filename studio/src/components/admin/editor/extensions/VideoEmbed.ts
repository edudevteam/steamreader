import { Node, mergeAttributes } from '@tiptap/core'

/**
 * A responsive YouTube or Vimeo player the author can drop into an article.
 *
 * Only the *identity* of the video is stored -- provider, id, unlisted key and
 * start offset -- never a URL the author typed. The `src` is rebuilt from those
 * parts every time the node renders, so no hand-edited markdown can smuggle an
 * arbitrary frame into published HTML.
 *
 * Like the CTA button, every visual choice is an inline style: the reader's
 * article body is a `prose` container with no rules of its own, so a class
 * would style nothing once the article is published.
 */

export type VideoProvider = 'youtube' | 'vimeo'

export interface VideoEmbedAttributes {
  provider: VideoProvider
  videoId: string
  /** Vimeo's unlisted-video key (`vimeo.com/123456789/abcdef1234`). */
  hash: string
  /** Start offset in seconds; 0 plays from the beginning. */
  start: number
  title: string
}

export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo'
}

// ------------------------------------------------------------- sanitisers
//
// The id ends up inside a `src` that is published with
// `dangerouslySetInnerHTML`, so it is validated on the way in *and* on the way
// out -- a hand-edited markdown source is just as much an input as the dialog.

const YOUTUBE_ID = /^[\w-]{11}$/
const VIMEO_ID = /^\d{6,12}$/
const VIMEO_HASH = /^[a-z0-9]{6,20}$/i
const MAX_START = 86_400

export function isValidVideoId(
  provider: VideoProvider,
  videoId: unknown
): boolean {
  const candidate = String(videoId ?? '').trim()
  return provider === 'vimeo'
    ? VIMEO_ID.test(candidate)
    : YOUTUBE_ID.test(candidate)
}

function safeProvider(value: unknown): VideoProvider {
  return String(value ?? '') === 'vimeo' ? 'vimeo' : 'youtube'
}

function safeStart(value: unknown): number {
  const seconds = Math.floor(Number(value))
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(seconds, MAX_START)
}

export function defaultVideoTitle(provider: VideoProvider): string {
  return `${VIDEO_PROVIDER_LABELS[provider]} video player`
}

export function normalizeVideoEmbed(
  attributes: Partial<VideoEmbedAttributes>
): VideoEmbedAttributes {
  const provider = safeProvider(attributes.provider)
  const videoId = String(attributes.videoId ?? '').trim()
  const hash = String(attributes.hash ?? '').trim()

  return {
    provider,
    videoId: isValidVideoId(provider, videoId) ? videoId : '',
    // Only Vimeo has unlisted keys, and only its player accepts one.
    hash: provider === 'vimeo' && VIMEO_HASH.test(hash) ? hash : '',
    start: safeStart(attributes.start),
    title: String(attributes.title ?? '').trim() || defaultVideoTitle(provider)
  }
}

// ------------------------------------------------------------------- urls

/** `90`, `90s` and `1h2m30s` -- every shape YouTube and Vimeo write. */
function parseSeconds(value: string | null | undefined): number {
  const candidate = String(value ?? '').trim()
  if (!candidate) return 0
  if (/^\d+$/.test(candidate)) return safeStart(candidate)

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(candidate)
  if (!match || !match.slice(1).some(Boolean)) return 0

  return safeStart(
    Number(match[1] ?? 0) * 3600 +
      Number(match[2] ?? 0) * 60 +
      Number(match[3] ?? 0)
  )
}

/** `https://host/a/b/` -> `['a', 'b']`. */
function pathSegments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean)
}

function startFromUrl(url: URL): number {
  // `#t=90s` is how both players write a deep link in the share sheet; the
  // query forms come from "copy link at current time" and from embed codes.
  const fragment = /^#?t=(.+)$/.exec(url.hash)

  return (
    parseSeconds(url.searchParams.get('t')) ||
    parseSeconds(url.searchParams.get('start')) ||
    parseSeconds(fragment?.[1])
  )
}

function parseYouTube(url: URL, host: string): VideoEmbedAttributes | null {
  const segments = pathSegments(url)

  // youtu.be/ID, plus the /embed/, /shorts/ and /live/ paths on the main site.
  const videoId =
    host === 'youtu.be'
      ? segments[0]
      : ['embed', 'shorts', 'live', 'v'].includes(segments[0] ?? '')
        ? segments[1]
        : url.searchParams.get('v') ?? ''

  if (!isValidVideoId('youtube', videoId)) return null

  return normalizeVideoEmbed({
    provider: 'youtube',
    videoId,
    start: startFromUrl(url)
  })
}

function parseVimeo(url: URL, host: string): VideoEmbedAttributes | null {
  const segments = pathSegments(url)

  // player.vimeo.com/video/ID, vimeo.com/ID, and the channel/group/showcase
  // paths, which all end with the id -- optionally followed by an unlisted key.
  const index = segments.findIndex((segment) => VIMEO_ID.test(segment))
  if (index === -1) return null

  const videoId = segments[index]
  const hash =
    host === 'player.vimeo.com'
      ? url.searchParams.get('h') ?? ''
      : segments[index + 1] ?? ''

  return normalizeVideoEmbed({
    provider: 'vimeo',
    videoId,
    hash,
    start: startFromUrl(url)
  })
}

/**
 * Any YouTube or Vimeo link an author might paste -> the parts we store.
 * Returns null for anything else, including other video hosts.
 */
export function parseVideoUrl(input: string): VideoEmbedAttributes | null {
  const candidate = String(input ?? '').trim()
  if (!candidate) return null

  let url: URL
  try {
    // A bare `youtu.be/abc` is a perfectly ordinary thing to paste.
    url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(candidate)
        ? candidate
        : `https://${candidate}`
    )
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  if (host === 'youtu.be' || /(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
    return parseYouTube(url, host)
  }
  if (/(^|\.)vimeo\.com$/.test(host)) return parseVimeo(url, host)

  return null
}

/** The `src` the published iframe gets, built only from validated parts. */
export function videoEmbedSrc(attributes: VideoEmbedAttributes): string {
  const { provider, videoId, hash, start } = normalizeVideoEmbed(attributes)

  if (provider === 'vimeo') {
    return (
      `https://player.vimeo.com/video/${videoId}` +
      (hash ? `?h=${hash}` : '') +
      (start ? `#t=${start}s` : '')
    )
  }

  // The no-cookie host plays identically but does not set tracking cookies
  // until the reader actually presses play.
  return (
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    (start ? `?start=${start}` : '')
  )
}

/** The link an author recognises, for prefilling the dialog when editing. */
export function videoShareUrl(attributes: VideoEmbedAttributes): string {
  const { provider, videoId, hash, start } = normalizeVideoEmbed(attributes)

  if (provider === 'vimeo') {
    return (
      `https://vimeo.com/${videoId}` +
      (hash ? `/${hash}` : '') +
      (start ? `#t=${start}s` : '')
    )
  }

  return `https://www.youtube.com/watch?v=${videoId}${
    start ? `&t=${start}` : ''
  }`
}

export const VIDEO_FRAME_STYLE = [
  'position:relative',
  'width:100%',
  // A 16:9 box that keeps its shape at every column width. Both players
  // letterbox anything shot in another ratio, so one box fits every video.
  'aspect-ratio:16/9',
  'margin:1.5rem 0'
].join(';')

export const VIDEO_IFRAME_STYLE = [
  'position:absolute',
  'top:0',
  'left:0',
  'width:100%',
  'height:100%',
  'border:0',
  'border-radius:0.75rem'
].join(';')

const YOUTUBE_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
const VIMEO_ALLOW = 'autoplay; fullscreen; picture-in-picture; clipboard-write'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attributes: Partial<VideoEmbedAttributes>) => ReturnType
      updateVideoEmbed: (
        attributes: Partial<VideoEmbedAttributes>
      ) => ReturnType
      unsetVideoEmbed: () => ReturnType
    }
  }
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      provider: {
        default: 'youtube' as VideoProvider,
        parseHTML: (element) =>
          safeProvider(element.getAttribute('data-video-embed')),
        renderHTML: (attributes) => ({
          'data-video-embed': safeProvider(attributes.provider)
        })
      },
      videoId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-video-id') ?? '',
        renderHTML: (attributes) => ({ 'data-video-id': attributes.videoId })
      },
      hash: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-video-hash') ?? '',
        renderHTML: (attributes) =>
          attributes.hash ? { 'data-video-hash': attributes.hash } : {}
      },
      start: {
        default: 0,
        parseHTML: (element) =>
          safeStart(element.getAttribute('data-video-start')),
        renderHTML: (attributes) =>
          attributes.start ? { 'data-video-start': attributes.start } : {}
      },
      title: {
        default: '',
        // Carried by the iframe it describes rather than duplicated onto the
        // wrapper, so the published markup has one copy of the title.
        parseHTML: (element) =>
          element.querySelector('iframe')?.getAttribute('title') ?? '',
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed]',
        // Above RawHtmlBlock's `iframe` rule, which would otherwise claim the
        // player inside and freeze it into an uneditable block of markup.
        priority: 100,
        getAttrs: (node) => {
          const element = node as HTMLElement
          const provider = safeProvider(
            element.getAttribute('data-video-embed')
          )
          // Not a video we can rebuild a safe `src` for -- let the raw-HTML
          // block keep it verbatim instead of rendering a broken player.
          return isValidVideoId(provider, element.getAttribute('data-video-id'))
            ? null
            : false
        }
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attributes = normalizeVideoEmbed(
      node.attrs as Partial<VideoEmbedAttributes>
    )

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'video-embed',
        style: VIDEO_FRAME_STYLE
      }),
      [
        'iframe',
        {
          src: videoEmbedSrc(attributes),
          title: attributes.title,
          loading: 'lazy',
          allow: attributes.provider === 'vimeo' ? VIMEO_ALLOW : YOUTUBE_ALLOW,
          allowfullscreen: 'true',
          referrerpolicy: 'strict-origin-when-cross-origin',
          style: VIDEO_IFRAME_STYLE
        }
      ]
    ]
  },

  renderText({ node }) {
    return videoShareUrl(node.attrs as VideoEmbedAttributes)
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: normalizeVideoEmbed(attributes)
          }),

      updateVideoEmbed:
        (attributes) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, normalizeVideoEmbed(attributes)),

      unsetVideoEmbed:
        () =>
        ({ commands }) =>
          commands.deleteSelection()
    }
  }
})

export default VideoEmbed
