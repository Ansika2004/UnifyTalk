import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, type User } from '@firebase/auth'
import { firebaseApp, firebaseConfigured } from '../firebase'

interface AuthState {
  user: User | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      // Skip Firebase auth in demo mode (no API key configured)
      if (!firebaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const auth = getAuth(firebaseApp)
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
          setUser(firebaseUser)
          setLoading(false)
        })
        return unsubscribe
      } catch (error) {
        console.error('Failed to load Firebase auth:', error)
        setLoading(false)
      }
    }

    const unsubscribePromise = initAuth()
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [])

  return { user, loading }
}
