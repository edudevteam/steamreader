import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import PasswordInput, { usePasswordValidation } from 'components/PasswordInput'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const { user, loading: authLoading, updatePassword, signOut } = useAuth()
  const navigate = useNavigate()

  const { isPasswordValid, passwordsMatch } = usePasswordValidation(password, confirmPassword)

  useEffect(() => {
    // Check if this is a password recovery flow
    // Supabase adds tokens to the URL hash which triggers an auth state change
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')

    if (type === 'recovery') {
      setIsRecoveryMode(true)
    }
  }, [])

  useEffect(() => {
    // Only redirect after auth has finished loading
    // If user is logged in (either normally or via recovery), allow access
    // If not logged in and not in recovery mode, redirect to login
    if (!authLoading) {
      if (!user && !isRecoveryMode) {
        navigate('/login')
      }
    }
  }, [user, authLoading, isRecoveryMode, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    // Validate password requirements
    if (!isPasswordValid) {
      setError('Password does not meet all requirements')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      if (isRecoveryMode) {
        // In recovery mode, sign out and redirect to login
        signOut()
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          <div className="mb-4 text-5xl text-green-500">&#10003;</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Password Updated</h1>
          <p className="mb-6 text-gray-600">
            Your password has been successfully updated.
          </p>
          <Link
            to="/account"
            className="inline-block rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            Go to Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          {isRecoveryMode ? 'Reset Your Password' : 'Change Password'}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {!isRecoveryMode && (
          <div className="mt-6 text-center text-sm text-gray-600">
            <Link to="/account" className="text-brand-600 hover:text-brand-500">
              Back to Account
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
