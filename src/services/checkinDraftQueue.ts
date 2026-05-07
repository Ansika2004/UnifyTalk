/**
 * Check-in draft queue backed by IndexedDB.
 * Used by Mental_Health_Module to store raw check-in responses when
 * the Mood_Analyzer API call fails, for retry after 5 minutes.
 * Requirements: 4.7
 */
// Offline resilience: verified in task 24.3

import type { CheckInResponse } from '../types'

const DB_NAME = 'unifytalk_offline'
const DB_VERSION = 2
const STORE_NAME = 'checkin_drafts'

export interface CheckInDraft {
  patientId: string
  responses: CheckInResponse[]
  savedAt: number // Date.now()
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('outbound_messages')) {
        db.createObjectStore('outbound_messages', { autoIncrement: true })
      }
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
 * Store a check-in draft in IndexedDB for later retry.
 * Requirements: 4.7
 */
export async function enqueueDraft(draft: CheckInDraft): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(draft)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieve and clear all check-in drafts from IndexedDB.
 * Requirements: 4.7
 */
export async function dequeueDrafts(): Promise<CheckInDraft[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const getAllRequest = store.getAll()
    getAllRequest.onsuccess = () => {
      const drafts = getAllRequest.result as CheckInDraft[]
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve(drafts)
      clearRequest.onerror = () => reject(clearRequest.error)
    }
    getAllRequest.onerror = () => reject(getAllRequest.error)
  })
}

/**
 * Get the number of drafts currently in the queue.
 * Requirements: 4.7
 */
export async function getDraftQueueLength(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
