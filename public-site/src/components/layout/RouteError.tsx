import { Link, useRouteError } from 'react-router-dom'

/**
 * Replaces React Router's built-in "Hey developer 👋" screen, which is aimed at
 * us rather than at whoever hit the error.
 *
 * The common failure here is a stale chunk: a deploy landed while the tab sat
 * open, so a lazy import reached for a hashed file that no longer exists.
 * lazyWithRetry reloads once on its own, and this screen is what remains if
 * even that did not help -- so it leads with the reload rather than burying it.
 */

const STALE_CHUNK_SIGNALS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css'
]

function isStaleChunkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalized = message.toLowerCase()
  return STALE_CHUNK_SIGNALS.some((signal) => normalized.includes(signal))
}

export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleChunkError(error)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">
        {stale ? 'This page is out of date' : 'Something went wrong'}
      </h1>
      <p className="mb-8 max-w-md text-gray-600">
        {stale
          ? 'A new version of STEAM Reader was published while this tab was open. Reload to pick it up -- nothing you saved is affected.'
          : 'We hit an unexpected error loading this page. Reloading usually clears it.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-block rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          Reload the page
        </button>
        <Link
          to="/"
          className="inline-block rounded-full px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
