import { useState, useMemo } from 'react'

interface PasswordInputProps {
  password: string
  setPassword: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  showGenerator?: boolean
}

export default function PasswordInput({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showGenerator = true
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [generatorLength, setGeneratorLength] = useState(16)

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

  const EyeOpenIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  const EyeClosedIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )

  return (
    <div className="space-y-4">
      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          {password && (
            <span className={`text-xs ${password.length >= 13 ? 'text-green-600' : 'text-gray-500'}`}>
              {password.length} characters
            </span>
          )}
        </div>
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
                ? 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
                : isPasswordValid
                  ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                  : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
            }`}
            placeholder="Enter password"
            minLength={13}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
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
        {showGenerator && (
          <div className="mt-3 rounded-md bg-gray-50 p-3">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <label htmlFor="passwordLength" className="text-sm text-gray-600">
                  Generator Length
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
                className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>13</span>
                <span>26</span>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="w-full rounded-md bg-brand-100 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Generate Password
            </button>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          {confirmPassword && (
            <span className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-gray-500'}`}>
              {confirmPassword.length} characters
            </span>
          )}
        </div>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`block w-full rounded-md border px-3 py-2 pr-10 shadow-sm focus:outline-none focus:ring-1 ${
              passwordsMatch === null
                ? 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
                : passwordsMatch
                  ? 'border-green-500 bg-green-50 focus:border-green-500 focus:ring-green-500'
                  : 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500'
            }`}
            placeholder="Confirm password"
            minLength={13}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        </div>
        {passwordsMatch === false && (
          <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
        )}
      </div>
    </div>
  )
}

// Export validation helpers for use in parent forms
export function usePasswordValidation(password: string, confirmPassword: string) {
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

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null
    return password === confirmPassword
  }, [password, confirmPassword])

  return { passwordRequirements, isPasswordValid, passwordsMatch }
}
