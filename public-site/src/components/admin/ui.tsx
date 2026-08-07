/** Shared primitives for the CMS screens, styled to match the public site. */
import {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes
} from 'react'
import { classNames } from 'utils'
import type { ArticleStatus, Role } from 'types'
import { ROLE_LABELS, STATUS_LABELS } from 'types/cms'

// ---------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_STYLES[variant],
        className
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- Fields

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-900"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
}

const INPUT_CLASS =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ' +
  'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(INPUT_CLASS, className)} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames(INPUT_CLASS, className)} />
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={classNames(INPUT_CLASS, 'pr-8', className)}>
      {children}
    </select>
  )
}

// ---------------------------------------------------------------- Layout

export function Card({
  className,
  children
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={classNames(
        'rounded-xl bg-white shadow-sm ring-1 ring-gray-200',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  description
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Feedback

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={classNames('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
    >
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
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500">
      <Spinner className="size-5" />
      {label}
    </div>
  )
}

export function Alert({
  kind,
  children
}: {
  kind: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const styles = {
    error: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-green-50 text-green-800 ring-green-200',
    info: 'bg-blue-50 text-blue-800 ring-blue-200'
  }[kind]

  return (
    <div
      className={classNames(
        'rounded-lg px-4 py-3 text-sm ring-1 ring-inset',
        styles
      )}
      role="alert"
    >
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- Badges

const STATUS_STYLES: Record<ArticleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-300',
  in_review: 'bg-amber-50 text-amber-800 ring-amber-300',
  published: 'bg-green-50 text-green-800 ring-green-300',
  archived: 'bg-gray-100 text-gray-500 ring-gray-300'
}

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const ROLE_STYLES: Record<Role, string> = {
  admin: 'bg-brand-50 text-brand-700 ring-brand-200',
  editor: 'bg-blue-50 text-blue-700 ring-blue-200',
  writer: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  user: 'bg-gray-100 text-gray-600 ring-gray-300'
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ROLE_STYLES[role]
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

// ---------------------------------------------------------------- Modal

export function Modal({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
