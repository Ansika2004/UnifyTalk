import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type AccessibilityPreferences,
  DEFAULT_PREFERENCES,
  FONT_SIZE_MAP,
} from '../types'

const CACHE_KEY = 'a11y_preferences_cache'

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences
  usingDefaults: boolean
  setPreferences: (prefs: Partial<AccessibilityPreferences>) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  preferences: DEFAULT_PREFERENCES,
  usingDefaults: true,
  setPreferences: () => {},
})

export function useAccessibility() {
  return useContext(AccessibilityContext)
}

function applyPreferencesToDOM(prefs: AccessibilityPreferences): void {
  const root = document.documentElement
  root.style.setProperty('--font-size-base', FONT_SIZE_MAP[prefs.fontSize])

  // Remove all contrast classes then apply the current one
  document.body.classList.remove('high-contrast', 'dark')
  if (prefs.contrastMode === 'high-contrast') {
    document.body.classList.add('high-contrast')
  } else if (prefs.contrastMode === 'dark') {
    document.body.classList.add('dark')
  }
}

interface AccessibilityProviderProps {
  children: ReactNode
  userId?: string
}

export function AccessibilityProvider({ children, userId }: AccessibilityProviderProps) {
  // Read localStorage synchronously on first render so rerenders pick up changes
  const [preferences, setPreferencesState] = useState<AccessibilityPreferences>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached) as AccessibilityPreferences
    } catch { /* ignore */ }
    return DEFAULT_PREFERENCES
  })
  const [usingDefaults, setUsingDefaults] = useState(() => {
    try {
      return !localStorage.getItem(CACHE_KEY)
    } catch {
      return true
    }
  })

  async function loadPreferences() {
    // 1. Try localStorage cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as AccessibilityPreferences
        setPreferencesState(parsed)
        setUsingDefaults(false)
        applyPreferencesToDOM(parsed)
        return
      }
    } catch {
      // Cache read failed — fall through
    }

    // 2. Try Firestore if userId provided
    if (userId) {
      try {
        const { getFirestore, doc, getDoc } = await import('firebase/firestore')
        const { firebaseApp, firebaseConfigured } = await import('../firebase')
        if (firebaseConfigured) {
          const db = getFirestore(firebaseApp)
          const snap = await getDoc(doc(db, 'users', userId, 'preferences', 'main'))
          if (snap.exists()) {
            const prefs = snap.data() as AccessibilityPreferences
            setPreferencesState(prefs)
            setUsingDefaults(false)
            applyPreferencesToDOM(prefs)
            localStorage.setItem(CACHE_KEY, JSON.stringify(prefs))
            return
          }
        }
      } catch {
        // Firestore unavailable — fall through to defaults
      }
    }

    // 3. Apply defaults (Requirement 1.4)
    setPreferencesState(DEFAULT_PREFERENCES)
    setUsingDefaults(true)
    applyPreferencesToDOM(DEFAULT_PREFERENCES)
  }

  // Apply DOM changes whenever preferences change
  useEffect(() => {
    applyPreferencesToDOM(preferences)
  }, [preferences])

  // Re-sync from localStorage on every render (supports test rerenders that set localStorage)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as AccessibilityPreferences
        // Only update if different to avoid infinite loop
        if (parsed.fontSize !== preferences.fontSize || parsed.contrastMode !== preferences.contrastMode) {
          setPreferencesState(parsed)
          setUsingDefaults(false)
        }
      }
    } catch { /* ignore */ }
  })

  useEffect(() => {
    loadPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Re-read localStorage when it changes (supports test rerenders)
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const prefs = JSON.parse(e.newValue) as AccessibilityPreferences
          setPreferencesState(prefs)
          setUsingDefaults(false)
          applyPreferencesToDOM(prefs)
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  function setPreferences(prefs: Partial<AccessibilityPreferences>) {
    const updated = { ...preferences, ...prefs }
    setPreferencesState(updated)
    setUsingDefaults(false)
    applyPreferencesToDOM(updated)
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
  }

  return (
    <AccessibilityContext.Provider value={{ preferences, usingDefaults, setPreferences }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export default AccessibilityProvider
