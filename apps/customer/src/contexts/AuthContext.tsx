import * as React from 'react'
import type { Session } from '@supabase/supabase-js'
import { resolveUserRole, type UserRole } from '../lib/roles'
import { hasSupabaseConfig, supabase } from '../services/supabaseClient'

export type AuthUser = {
  id: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUserPhone: (phone: string) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const AUTH_FALLBACK: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  updateUserPhone: () => {},
}

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    return AUTH_FALLBACK
  }
  return context
}

async function loadProfile(userId: string, email: string | null): Promise<AuthUser> {
  const base: AuthUser = {
    id: userId,
    email,
    phone: null,
    firstName: null,
    lastName: null,
    role: resolveUserRole({ email }),
  }
  if (!supabase) return base
  try {
    const { data, error } = await supabase
      .from('users')
      .select('phone, first_name, last_name, full_name, email, role')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return base
    const firstName = (data.first_name as string | null) ?? null
    const lastName = (data.last_name as string | null) ?? null
    const fullName = (data.full_name as string | null) ?? null
    const profileEmail = (data.email as string | null) ?? email
    return {
      id: userId,
      email: profileEmail,
      phone: (data.phone as string | null) ?? null,
      firstName,
      lastName,
      role: resolveUserRole({
        role: data.role as string | null,
        email: profileEmail,
        firstName,
        lastName,
        fullName,
      }),
    }
  } catch {
    return base
  }
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    const applySession = async (next: Session | null) => {
      setSession(next)
      if (!next?.user) {
        setUser(null)
        return
      }
      const profile = await loadProfile(next.user.id, next.user.email ?? null)
      if (!cancelled) setUser(profile)
    }

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setUser(null)
    setSession(null)
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('signOut error:', error)
      }
    }
  }

  const refreshUser = async () => {
    if (!supabase) return
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const profile = await loadProfile(data.user.id, data.user.email ?? null)
        setUser(profile)
      }
    } catch (error) {
      console.error('refreshUser error:', error)
    }
  }

  const updateUserPhone = (phone: string) => {
    setUser((current) => (current ? { ...current, phone } : current))
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    refreshUser,
    updateUserPhone,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
