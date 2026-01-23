import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'

export default function EmailConfirmedPage() {
  const { signOut } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Sign out the user so they have to log in manually
    const handleSignOut = async () => {
      await signOut()
      setReady(true)
    }
    handleSignOut()
  }, [signOut])

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          <p className="text-gray-600">Verifying...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-8 shadow-md text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900">Email Verified</h1>

        <p className="mb-6 text-gray-600">
          Your email has been verified and your account is now active. Please log in to access your account.
        </p>

        <Link
          to="/login"
          className="inline-block w-full rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Log In
        </Link>
      </div>
    </div>
  )
}
