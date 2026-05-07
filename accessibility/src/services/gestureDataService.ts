/**
 * gestureDataService.ts
 * Manages gesture dataset collection with consent enforcement.
 *
 * Firestore path: gestures/{userId}/sessions/{sessionId}
 *
 * Requirements: 24.1 (consent gate), 24.2 (deletion mechanism),
 *               24.3 (secure storage), 24.4 (summary view)
 */

import { firebaseApp, firebaseConfigured } from '@/firebase'
import type { GestureRecognitionResult } from '@/types'

export interface GestureSession {
  sessionId: string
  userId: string
  results: GestureRecognitionResult[]
  consentVersion: string
  createdAt: number // Unix ms
}

export interface GestureDataSummary {
  count: number
  dateRange: { from: Date; to: Date } | null
}

// ─── 3.2.1 Consent gate ───────────────────────────────────────────────────────

/**
 * Append gesture session data to Firestore gestures/{userId}/sessions/{sessionId}.
 * No-op when gestureDataConsent is false or firebaseConfigured is false.
 *
 * Requirement 24.1: explicit consent before collecting gesture data.
 */
export async function appendGestureSession(
  userId: string,
  sessionId: string,
  results: GestureRecognitionResult[],
  consentVersion: string,
  gestureDataConsent: boolean,
): Promise<void> {
  // 3.2.1 — consent gate: bail out immediately if consent not given
  if (!gestureDataConsent) return
  // No-op when Firebase is not configured
  if (!firebaseConfigured) return
  if (!userId || !sessionId || results.length === 0) return

  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const ref = doc(db, `gestures/${userId}/sessions/${sessionId}`)
    const session: GestureSession = {
      sessionId,
      userId,
      results,
      consentVersion,
      createdAt: Date.now(),
    }
    await setDoc(ref, session)
  } catch {
    // Silently fail — offline or permission error; data is cached locally
  }
}

// ─── 3.2.3 Deletion mechanism ─────────────────────────────────────────────────

/**
 * Delete all gesture session documents for a user from Firestore.
 * No-op when firebaseConfigured is false.
 *
 * Requirement 24.2: provide mechanism to request deletion of collected gesture data.
 */
export async function requestGestureDataDeletion(userId: string): Promise<void> {
  if (!firebaseConfigured) return
  if (!userId) return

  try {
    const { getFirestore, collection, getDocs, writeBatch } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const sessionsCol = collection(db, `gestures/${userId}/sessions`)
    const snap = await getDocs(sessionsCol)

    if (snap.empty) return

    // Firestore batch supports up to 500 operations; chunk if needed
    const BATCH_SIZE = 500
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  } catch {
    // Silently fail — caller should surface an error to the user if needed
    throw new Error('Failed to delete gesture data. Please try again.')
  }
}

// ─── 3.2.4 Summary view ───────────────────────────────────────────────────────

/**
 * Return a summary of gesture data collected for a user.
 * Returns { count: 0, dateRange: null } when firebaseConfigured is false.
 *
 * Requirement 24.4: users can review a summary of collected gesture data.
 */
export async function getGestureDataSummary(userId: string): Promise<GestureDataSummary> {
  if (!firebaseConfigured || !userId) {
    return { count: 0, dateRange: null }
  }

  try {
    const { getFirestore, collection, getDocs, query, orderBy } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const sessionsCol = collection(db, `gestures/${userId}/sessions`)
    const snap = await getDocs(query(sessionsCol, orderBy('createdAt', 'asc')))

    if (snap.empty) return { count: 0, dateRange: null }

    const sessions = snap.docs.map((d) => d.data() as GestureSession)
    const timestamps = sessions.map((s) => s.createdAt).filter(Boolean)

    return {
      count: sessions.length,
      dateRange:
        timestamps.length > 0
          ? {
              from: new Date(Math.min(...timestamps)),
              to: new Date(Math.max(...timestamps)),
            }
          : null,
    }
  } catch {
    return { count: 0, dateRange: null }
  }
}
