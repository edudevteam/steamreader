import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from 'lib/supabase'
import { ROLE_RANK, type Role } from 'types/cms'

/**
 * The caller's own profile row.
 *
 * `email` and `birthdate` are deliberately absent: PostgREST is not granted
 * those columns for any browser role, so selecting them fails. Read the address
 * from `user.email` on the auth session instead, which is where it actually
 * belongs.
 */
export interface UserProfile {
  id: string
  display_name: string | null
  role: Role
  slug: string | null
  bio: string | null
  avatar_url: string | null
  social: Record<string, string> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Kept in sync with UserProfile -- `select('*')` would hit the revoked columns.
const PROFILE_COLUMNS =
  'id, display_name, role, slug, bio, avatar_url, social, is_active, created_at, updated_at'

type EditableProfileFields = Pick<
  UserProfile,
  'display_name' | 'bio' | 'avatar_url' | 'social'
>

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  /** True once the profile row has been resolved, so guards do not flash. */
  role: Role
  isAdmin: boolean
  isEditor: boolean
  isContributor: boolean
  hasRole: (minimum: Role) => boolean
  signUp: (
    email: string,
    password: string,
    birthdate: Date,
    displayName?: string
  ) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => void
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  updateProfile: (
    updates: Partial<EditableProfileFields>
  ) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data as UserProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  useEffect(() => {
    let active = true
    // Only the newest resolve may publish. Signing out and back in quickly, or
    // a token refresh landing mid-fetch, would otherwise let a stale profile
    // response overwrite a newer one.
    let latest = 0

    /**
     * Publishes a session and the profile row that belongs to it.
     *
     * Must run *outside* the onAuthStateChange callback. auth-js invokes those
     * callbacks while holding its Web Locks token lock, and every PostgREST
     * query needs that same lock to read the access token -- so awaiting a
     * query inside the callback deadlocks the callback and every concurrent
     * getSession() with it. That hangs the whole app behind a loading screen.
     */
    const resolveSession = async (session: Session | null) => {
      const ticket = ++latest

      setSession(session)
      setUser(session?.user ?? null)

      // Profile is created by a database trigger on email confirmation.
      const nextProfile = session?.user
        ? await fetchProfile(session.user.id)
        : null

      if (!active || ticket !== latest) return

      setProfile(nextProfile)
      // Settles even when the profile could not be read, so a failed lookup
      // surfaces as "no access" rather than an endless spinner.
      setLoading(false)
    }

    // Fires INITIAL_SESSION on subscribe, so this covers first load too and no
    // separate getSession() call is needed.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) void resolveSession(session)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (
    email: string,
    password: string,
    birthdate: Date,
    displayName?: string
  ) => {
    // Validate age (must be 13+)
    const today = new Date()
    const age = today.getFullYear() - birthdate.getFullYear()
    const monthDiff = today.getMonth() - birthdate.getMonth()
    const isOldEnough =
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthdate.getDate())
        ? age - 1 >= 13
        : age >= 13

    if (!isOldEnough) {
      return {
        error: new Error('You must be at least 13 years old to sign up.')
      }
    }

    // Sign up with email confirmation
    // Profile is auto-created by database trigger
    // display_name and birthdate are stored in user metadata and synced to profile on first login
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirmed`,
        data: {
          display_name: displayName,
          birthdate: birthdate.toISOString().split('T')[0]
        }
      }
    })

    return { error: error || null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = () => {
    // Revoke the refresh token server-side first; clearing storage alone would
    // leave a valid session behind on Supabase.
    void supabase.auth.signOut().finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login'
    })
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  const updateProfile = async (updates: Partial<EditableProfileFields>) => {
    if (!user) {
      return { error: new Error('No user logged in') }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null))
    }

    return { error }
  }

  const refreshProfile = async () => {
    if (!user) return
    setProfile(await fetchProfile(user.id))
  }

  // A user with no profile row yet is treated as a plain reader, never as
  // staff -- an unresolved profile must not grant CMS access.
  const role: Role =
    profile?.is_active === false ? 'user' : profile?.role ?? 'user'
  const hasRole = (minimum: Role) => ROLE_RANK[role] >= ROLE_RANK[minimum]

  const value = {
    user,
    profile,
    session,
    loading,
    role,
    isAdmin: role === 'admin',
    isEditor: hasRole('editor'),
    isContributor: hasRole('writer'),
    hasRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
