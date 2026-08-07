import type { ReactNode } from 'react'

/**
 * Loading and error shell for pages whose content now comes from Supabase.
 *
 * Content used to be bundled JSON and rendered synchronously, so nothing on
 * the public site had a loading state. This keeps that transition uniform
 * rather than scattering spinners page by page.
 */
export default function ContentState({
  loading,
  error,
  onRetry,
  children
}: {
  loading: boolean
  error: string | null
  onRetry?: () => void
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-gray-500">
        <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-medium text-gray-900">
          We could not load this content
        </p>
        <p className="mt-1 text-sm text-gray-600">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}
