import { useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseApp, firebaseConfigured } from '../firebase'
import { useGlobalStore, type SupportedLocale } from '../store/globalStore'

/**
 * Maps a raw navigator.language string to a supported locale.
 * Exported for testability (Req 7.1, 7.2).
 */
export function mapLocale(raw: string): SupportedLocale {
  const lower = raw.toLowerCase()
  if (lower.startsWith('kn')) return 'kn'
  if (lower.startsWith('hi')) return 'hi'
  if (lower.startsWith('ta')) return 'ta'
  if (lower.startsWith('te')) return 'te'
  if (lower.startsWith('bn')) return 'bn'
  return 'en'
}

/**
 * LanguageDetector — side-effect-only component (renders null).
 *
 * On mount:
 *  1. Reads navigator.language and maps it to a SupportedLocale.
 *  2. Calls setLanguage() to update the Zustand store.
 *  3. If a Firebase Auth user is logged in, persists the locale to
 *     Firestore at /patients/{uid}.preferredLanguage (Req 7.1, 7.2).
 */
export function LanguageDetector(): null {
  const setLanguage = useGlobalStore((s) => s.setLanguage)

  useEffect(() => {
    const detected = mapLocale(navigator.language ?? 'en')
    setLanguage(detected)

    if (!firebaseConfigured) return

    const auth = getAuth(firebaseApp)
    const user = auth.currentUser
    if (user) {
      const db = getFirestore(firebaseApp)
      setDoc(
        doc(db, 'patients', user.uid),
        { preferredLanguage: detected, updatedAt: serverTimestamp() },
        { merge: true },
      ).catch((err) => {
        console.error('[LanguageDetector] Failed to persist preferredLanguage:', err)
      })
    }
  }, [setLanguage])

  return null
}
