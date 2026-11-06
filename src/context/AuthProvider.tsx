import { useEffect, useState, type ReactNode } from 'react'
import type { AuthSession } from '../services'
import { authService } from '../services'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getSession().then((s) => {
      setSession(s)
      setLoading(false)
    })
    return authService.onAuthChange(setSession)
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, signOut: authService.signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
