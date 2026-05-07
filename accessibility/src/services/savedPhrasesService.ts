/**
 * savedPhrasesService.ts
 * Persists saved phrases to Firestore users/{userId}/savedPhrases
 * and caches them in IndexedDB under key 'saved_phrases_cache'.
 *
 * Load strategy: IndexedDB first (fast startup), then sync from Firestore.
 * Requirements: 6.1, 6.2, 6.3
 */

import { firebaseApp, firebaseConfigured } from '@/firebase'
import type { SavedPhrase } from '@/types'

const IDB_DB_NAME = 'unifytalk'
const IDB_STORE = 'keyval'
const IDB_KEY = 'saved_phrases_cache'

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadPhrasesFromIDB(): Promise<SavedPhrase[]> {
  try {
    const db = await openDB()
    const idbResult = await new Promise<SavedPhrase[] | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve((req.result as SavedPhrase[]) ?? null)
      req.onerror = () => resolve(null)
    })
    if (idbResult && idbResult.length > 0) return idbResult
  } catch {
    // fall through to localStorage
  }
  // Fallback: migrate from legacy localStorage cache
  try {
    const raw = localStorage.getItem(IDB_KEY)
    if (raw) return JSON.parse(raw) as SavedPhrase[]
  } catch { /* ignore */ }
  return []
}

export async function savePhrasesToIDB(phrases: SavedPhrase[]): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(phrases, IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail — IndexedDB may be unavailable in some environments
  }
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

function firestorePath(userId: string) {
  return `users/${userId}/savedPhrases`
}

export async function loadPhrasesFromFirestore(userId: string): Promise<SavedPhrase[]> {
  if (!firebaseConfigured) return []
  try {
    const { getFirestore, collection, getDocs, query, orderBy } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const col = collection(db, firestorePath(userId))
    const snap = await getDocs(query(col, orderBy('order', 'asc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedPhrase))
  } catch {
    return []
  }
}

export async function savePhraseToFirestore(userId: string, phrase: SavedPhrase): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const ref = doc(db, firestorePath(userId), phrase.id)
    await setDoc(ref, phrase)
  } catch {
    // Offline — IndexedDB cache is the source of truth until reconnect
  }
}

export async function deletePhraseFromFirestore(userId: string, phraseId: string): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    await deleteDoc(doc(db, firestorePath(userId), phraseId))
  } catch {
    // Offline — will be reconciled on reconnect
  }
}

export async function updatePhraseInFirestore(userId: string, phrase: SavedPhrase): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const ref = doc(db, firestorePath(userId), phrase.id)
    await updateDoc(ref, { ...phrase })
  } catch {
    // Offline — IndexedDB cache is the source of truth until reconnect
  }
}

/** Overwrite the entire savedPhrases collection (used for reorder). */
export async function syncAllPhrasesToFirestore(userId: string, phrases: SavedPhrase[]): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, writeBatch, collection } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const batch = writeBatch(db)
    const col = collection(db, firestorePath(userId))
    phrases.forEach((p) => {
      batch.set(doc(col, p.id), p)
    })
    await batch.commit()
  } catch {
    // Offline — will be reconciled on reconnect
  }
}

// ─── Combined load: IDB first, then Firestore sync ───────────────────────────

/**
 * Load phrases for a user.
 * Returns IDB cache immediately; caller should also await the Firestore
 * sync and update state when it resolves.
 */
export async function loadPhrases(userId: string | null): Promise<{
  cached: SavedPhrase[]
  synced: Promise<SavedPhrase[]>
}> {
  const cached = await loadPhrasesFromIDB()
  const synced = userId
    ? loadPhrasesFromFirestore(userId).then(async (remote) => {
        if (remote.length > 0) {
          await savePhrasesToIDB(remote)
          return remote
        }
        return cached
      })
    : Promise.resolve(cached)
  return { cached, synced }
}
