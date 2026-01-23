import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [generatorLength, setGeneratorLength] = useState(16)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Generate a secure password meeting all requirements
  const generatePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const all = lowercase + uppercase + special + '0123456789'

    // Ensure at least one of each required type
    let newPassword = ''
    newPassword += lowercase[Math.floor(Math.random() * lowercase.length)]
    newPassword += uppercase[Math.floor(Math.random() * uppercase.length)]
    newPassword += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = 3; i < generatorLength; i++) {
      newPassword += all[Math.floor(Math.random() * all.length)]
    }

    // Shuffle the password
    newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('')

    setPassword(newPassword)
    setConfirmPassword(newPassword)
    setShowPassword(true)
    setShowConfirmPassword(true)
  }

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
            className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  ? 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  : isOldEnough
                    ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                    : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
              }`}
            />
            {isOldEnough === false && (
              <p className="mt-1 text-sm text-red-600">You must be at least 13 years old</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
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
                placeholder="••••••••"
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

            {/* Password Generator */}
            <div className="mt-3 rounded-md bg-gray-50 p-3">
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="passwordLength" className="text-sm text-gray-600">
                    Total Characters
                  </label>
                  <span className="text-sm font-medium text-gray-900">{generatorLength}</span>
                </div>
                <input
                  id="passwordLength"
                  type="range"
                  min={13}
                  max={26}
                  value={generatorLength}
                  onChange={(e) => setGeneratorLength(Number(e.target.value))}
                  className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>13</span>
                  <span>26</span>
                </div>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="w-full rounded-md bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Generate Password
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
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
                placeholder="••••••••"
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you confirm that you are at least 13 years old and agree to our{' '}
          <Link to="/terms" className="text-indigo-600 hover:text-indigo-500 underline">
            Terms and Conditions
          </Link>.
        </p>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
