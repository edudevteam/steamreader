import '@testing-library/jest-dom/vitest'

/**
 * happy-dom 15 crashes on any live `<iframe>` that lands in a document without
 * a default view -- exactly the document `DOMParser` builds, which is how
 * TipTap reads content into the editor. With `disableIframePageLoading` set
 * (see vite.config.ts) it reports "iframe page loading is disabled" through
 * `window.console`, and that window is null.
 *
 * No test wants an iframe to load, so the hook that would start the load is
 * stubbed out rather than left to report an error it cannot report.
 */
const IFRAME_PROTOTYPE = window.HTMLIFrameElement.prototype
const connectedToDocument = Object.getOwnPropertySymbols(IFRAME_PROTOTYPE).find(
  (symbol) => symbol.description === 'connectedToDocument'
)

if (connectedToDocument) {
  Object.defineProperty(IFRAME_PROTOTYPE, connectedToDocument, {
    value: () => {},
    configurable: true,
    writable: true
  })
}
