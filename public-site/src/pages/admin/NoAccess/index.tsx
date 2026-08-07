import { Link } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'

/** Shown when a signed-in reader lands on a CMS route they cannot use. */
export default function NoAccessPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="size-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.5 0l-7.1 12.25A2 2 0 004.99 19z"
            />
          </svg>
        </div>

        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          No access to the CMS
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {profile?.is_active === false
            ? 'This account has been deactivated. Contact an administrator if you think that is a mistake.'
            : 'Your account is a reader account. Ask an administrator to give you the Writer role.'}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Back to the site
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
