import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { user, loading: authLoading, updatePassword } = useAuth()
  const navigate = useNavigate()

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

  // Password requirements validation
  const passwordRequirements = useMemo(() => {
    if (!password) return null
    return {
      minLength: password.length >= 13,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }
  }, [password])

  const isPasswordValid = useMemo(() => {
    if (!passwordRequirements) return null
    return Object.values(passwordRequirements).every(Boolean)
  }, [passwordRequirements])

  // Check if passwords match
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null
    return password === confirmPassword
  }, [password, confirmPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
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
      setSuccess(true)
      setLoading(false)
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
            className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Must be 13+ characters with uppercase, lowercase, and special character
            </p>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-1 ${
                  isPasswordValid === null
                    ? 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    : isPasswordValid
                      ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                      : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
                }`}
                placeholder="Enter new password"
                minLength={13}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordRequirements ? (
              <ul className="mt-2 space-y-1 text-sm">
                <li className={passwordRequirements.minLength ? 'text-green-600' : 'text-red-600'}>
                  {passwordRequirements.minLength ? '✓' : '✗'} At least 13 characters
                </li>
                <li className={passwordRequirements.hasLowercase ? 'text-green-600' : 'text-red-600'}>
                  {passwordRequirements.hasLowercase ? '✓' : '✗'} One lowercase letter
                </li>
                <li className={passwordRequirements.hasUppercase ? 'text-green-600' : 'text-red-600'}>
                  {passwordRequirements.hasUppercase ? '✓' : '✗'} One uppercase letter
                </li>
                <li className={passwordRequirements.hasSpecial ? 'text-green-600' : 'text-red-600'}>
                  {passwordRequirements.hasSpecial ? '✓' : '✗'} One special character
                </li>
              </ul>
            ) : null}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-1 ${
                  passwordsMatch === null
                    ? 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    : passwordsMatch
                      ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                      : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
                }`}
                placeholder="Confirm new password"
                minLength={13}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordsMatch === false && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {!isRecoveryMode && (
          <div className="mt-6 text-center text-sm text-gray-600">
            <Link to="/account" className="text-indigo-600 hover:text-indigo-500">
              Back to Account
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
