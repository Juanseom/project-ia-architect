import { createContext } from 'react'
import type { AuthSession } from '../services'

export interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
