import { useState, useEffect } from 'react'
import {
  subscribeToAuthState,
  getCurrentUser,
  type AuthUser,
} from '@/services/authService'

export interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
}

/**
 * React hook that tracks Firebase Auth state.
 * Returns the current user and a loading flag (true until the first
 * auth state event has been received).
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(nextUser => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
