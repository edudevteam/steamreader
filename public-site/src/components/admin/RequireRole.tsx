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
  const { user, profile, loading, hasRole } = useAuth()
  const location = useLocation()

  // Wait for both the session and the profile row; checking too early would
  // bounce a legitimate admin to the login page on refresh.
  if (loading || (user && !profile)) {
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
