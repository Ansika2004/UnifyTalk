import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined

export const firebaseConfigured = Boolean(apiKey)

const firebaseConfig = {
  apiKey: apiKey ?? 'demo-placeholder',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000',
}

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Pre-initialize Firestore once so all callers get the same valid instance.
// This avoids the "Expected first argument to collection() to be a CollectionReference
// or FirebaseFirestore" error that occurs when getFirestore() is called with an
// app that was initialized with incomplete config.
let _db: Firestore | null = null
export function getDb(): Firestore | null {
  if (!firebaseConfigured) return null
  if (!_db) _db = getFirestore(firebaseApp)
  return _db
}
