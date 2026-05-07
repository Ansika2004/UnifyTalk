/**
 * Offline message queue backed by IndexedDB.
 * Used by Doctor_Bridge to queue outgoing messages when Firestore is disconnected.
 * Requirements: 6.8
 */
// Offline resilience: verified in task 24.3

const DB_NAME = 'unifytalk_offline'
const DB_VERSION = 1
const STORE_NAME = 'outbound_messages'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

/**
 * Store a message in the IndexedDB outbound queue.
 * Requirements: 6.8
 */
export async function enqueue(message: object): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(message)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieve and clear all queued messages from IndexedDB.
 * Requirements: 6.8
 */
export async function dequeue(): Promise<object[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const getAllRequest = store.getAll()
    getAllRequest.onsuccess = () => {
      const messages = getAllRequest.result as object[]
      // Clear the store after reading
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve(messages)
      clearRequest.onerror = () => reject(clearRequest.error)
    }
    getAllRequest.onerror = () => reject(getAllRequest.error)
  })
}

/**
 * Get the number of messages currently in the queue.
 * Requirements: 6.8
 */
export async function getQueueLength(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
