import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import { LoadingBlock } from './ui'
import type { Role } from 'types'

/**
 * Client-side route guard.
 *
 * This is a navigation convenience, not the security boundary -- RLS on the
 * database is. Someone who bypasses this component reaches a screen whose
 * every query returns nothing.
 */
export default function RequireRole({
  minimum,
  children
}: {
  minimum: Role
  children: React.ReactNode
}) {
  const { user, loading, hasRole } = useAuth()
  const location = useLocation()

  // `loading` stays true until the session *and* its profile row have settled,
  // so checking here cannot bounce a legitimate admin on refresh. Waiting on
  // `profile` as well would hang forever whenever the row cannot be read --
  // an unreadable profile falls back to the 'user' role and lands on
  // /admin/no-access instead, which is at least visible and actionable.
  if (loading) {
    return <LoadingBlock label="Checking permissions…" />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!hasRole(minimum)) {
    return <Navigate to="/admin/no-access" replace />
  }

  return <>{children}</>
}
