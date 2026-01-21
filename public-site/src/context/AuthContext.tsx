import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from 'lib/supabase'

interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  birthdate: string | null
  role: 'admin' | 'manager' | 'user'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, birthdate: Date, displayName?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Pick<UserProfile, 'display_name'>>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data as UserProfile
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id).then(setProfile).catch(console.error)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error getting session:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user.id)
            setProfile(profile)
          } catch (error) {
            console.error('Error fetching profile:', error)
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, birthdate: Date, displayName?: string) => {
    // Validate age (must be 13+)
    const today = new Date()
    const age = today.getFullYear() - birthdate.getFullYear()
    const monthDiff = today.getMonth() - birthdate.getMonth()
    const isOldEnough = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())
      ? age - 1 >= 13
      : age >= 13

    if (!isOldEnough) {
      return { error: new Error('You must be at least 13 years old to sign up.') }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          birthdate: birthdate.toISOString().split('T')[0]
        }
      }
    })

    if (error) {
      return { error }
    }

    // Update profile with birthdate and display name after signup
    // The profile is auto-created by the database trigger
    // We'll update it with additional fields
    const { data: { user: newUser } } = await supabase.auth.getUser()
    if (newUser) {
      await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          birthdate: birthdate.toISOString().split('T')[0]
        })
        .eq('id', newUser.id)
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account`
    })
    return { error }
  }

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'display_name'>>) => {
    if (!user) {
      return { error: new Error('No user logged in') }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile
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
