import { firebaseConfigured, firebaseApp } from '@/firebase'
import type { UserProfile } from '@/types'
import { DEFAULT_PREFERENCES } from '@/types'

// ─── Public User type ─────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

const DEMO_USER: AuthUser = {
  uid: 'demo-user-001',
  email: 'demo@unifytalk.app',
  displayName: 'Demo User',
}

// ─── Internal state ───────────────────────────────────────────────────────────

let _currentUser: AuthUser | null = null
const _listeners = new Set<(user: AuthUser | null) => void>()

function _notify(user: AuthUser | null) {
  _currentUser = user
  _listeners.forEach(fn => fn(user))
}

// ─── Firestore profile helpers ────────────────────────────────────────────────

/**
 * Creates or updates the Firestore users/{userId} document.
 * Only sets fields that are missing (merge: true) so existing data is preserved.
 */
async function _ensureUserProfile(user: AuthUser): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      // New user — create minimal profile
      const profile: Partial<UserProfile> & { createdAt: unknown } = {
        userId: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        language: 'en-US',
        disabilityTypes: [],
        preferredCommunicationMode: 'text',
        preferences: DEFAULT_PREFERENCES,
        emergencyContacts: [],
        gestureDataConsent: false,
        analyticsConsent: false,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
      }
      await setDoc(ref, profile)
    } else {
      // Existing user — only refresh mutable identity fields
      await setDoc(
        ref,
        {
          displayName: user.displayName ?? snap.data()?.displayName ?? '',
          email: user.email ?? snap.data()?.email ?? '',
        },
        { merge: true },
      )
    }
  } catch (err) {
    // Non-fatal — profile sync failure should not block sign-in
    console.warn('[authService] Failed to sync user profile:', err)
  }
}

// ─── Bootstrap Firebase Auth listener (called once on module load) ────────────

let _bootstrapped = false

async function _bootstrap() {
  if (_bootstrapped || !firebaseConfigured) return
  _bootstrapped = true
  const { getAuth, onAuthStateChanged } = await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  onAuthStateChanged(auth, fbUser => {
    if (fbUser) {
      const user: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
      }
      _notify(user)
    } else {
      _notify(null)
    }
  })
}

// Kick off bootstrap immediately (non-blocking)
_bootstrap().catch(console.warn)

// ─── Public API ───────────────────────────────────────────────────────────────

/** Sign in with email and password. */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!firebaseConfigured) {
    const user = { ...DEMO_USER, email }
    _notify(user)
    return user
  }
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const user: AuthUser = {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
  }
  await _ensureUserProfile(user)
  return user
}

/** Register a new account with email and password. */
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
  if (!firebaseConfigured) {
    const user = { ...DEMO_USER, email, displayName: displayName ?? DEMO_USER.displayName }
    _notify(user)
    return user
  }
  const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  const user: AuthUser = {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
  }
  await _ensureUserProfile(user)
  return user
}

/** Sign in with Google OAuth (popup). */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!firebaseConfigured) {
    _notify(DEMO_USER)
    return DEMO_USER
  }
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const user: AuthUser = {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
  }
  await _ensureUserProfile(user)
  return user
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  if (!firebaseConfigured) {
    _notify(null)
    return
  }
  const { getAuth, signOut: fbSignOut } = await import('firebase/auth')
  await fbSignOut(getAuth(firebaseApp))
  // _notify(null) is called by the onAuthStateChanged listener
}

/** Returns the currently authenticated user (or null). */
export function getCurrentUser(): AuthUser | null {
  if (!firebaseConfigured) return DEMO_USER
  return _currentUser
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  if (!firebaseConfigured) {
    // Immediately emit demo user and never change
    callback(DEMO_USER)
    return () => { /* no-op */ }
  }
  _listeners.add(callback)
  // Emit current state immediately
  callback(_currentUser)
  return () => { _listeners.delete(callback) }
}
