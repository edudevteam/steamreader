import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import PasswordInput, { usePasswordValidation } from 'components/PasswordInput'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const { isPasswordValid, passwordsMatch } = usePasswordValidation(password, confirmPassword)

  // Check if user is 13+ based on birthdate
  const isOldEnough = useMemo(() => {
    if (!birthdate) return null
    const birth = new Date(birthdate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
      ? age - 1
      : age
    return actualAge >= 13
  }, [birthdate])

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

    // Validate birthdate is provided
    if (!birthdate) {
      setError('Please enter your birthdate')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, new Date(birthdate), displayName || undefined)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          <div className="mb-4 text-5xl">📧</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="mb-6 text-gray-600">
            We've sent a confirmation link to <strong>{email}</strong>.
            Please click the link to verify your account.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">Create Account</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700">
              Birthdate <span className="text-gray-400">(must be 13+)</span>
            </label>
            <input
              id="birthdate"
              type="date"
              required
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                isOldEnough === null
                  ? 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
                  : isOldEnough
                    ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
              }`}
            />
            {isOldEnough === false && (
              <p className="mt-1 text-sm text-red-600">You must be at least 13 years old</p>
            )}
          </div>

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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you confirm that you are at least 13 years old and agree to our{' '}
          <Link to="/terms" className="text-brand-600 hover:text-brand-500 underline">
            Terms and Conditions
          </Link>.
        </p>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
