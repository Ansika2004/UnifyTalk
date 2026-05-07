/**
 * SOS_Module service — pure dispatch logic extracted for testability.
 * Requirements: 1.2, 1.6, 1.7
 */
// Offline resilience: verified in task 24.3
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '../firebase'
import type { SOSAlert } from '../types'


/**
 * Stub FCM dispatch — in production this would call a Firebase Cloud Function.
 * Returns a promise that resolves on success or rejects on failure.
 */
export async function dispatchSOS(_payload: Omit<SOSAlert, 'retryCount'>): Promise<void> {
  // Stub: simulate successful FCM dispatch
  // Real implementation: await httpsCallable(functions, 'dispatchSOS')(payload)
  return Promise.resolve()
}

/**
 * Retry wrapper with exponential backoff.
 * Calls dispatchFn up to maxRetries times.
 * Delays: baseDelayMs, baseDelayMs*2, baseDelayMs*4, ...
 *
 * Returns the final retryCount (0 = succeeded on first try).
 * Throws if all retries are exhausted.
 *
 * Requirements: 1.6
 */
export async function dispatchWithRetry(
  dispatchFn: () => Promise<void>,
  maxRetries: number,
  baseDelayMs: number,
): Promise<number> {
  let attempt = 0

  while (true) {
    try {
      await dispatchFn()
      return attempt // retryCount = number of retries before success
    } catch (err) {
      if (attempt >= maxRetries) {
        throw err
      }
      const delay = baseDelayMs * Math.pow(2, attempt)
      await sleep(delay)
      attempt++
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Write an SOSAlert document to Firestore for audit purposes.
 * Requirements: 1.7
 */
export async function writeSOSAlert(
  alert: Omit<SOSAlert, 'timestamp'> & { timestamp?: SOSAlert['timestamp'] },
): Promise<string> {
  const db = getDb()
  if (!db) return 'offline'
  const alertsRef = collection(db, 'sos_alerts')
  const docRef = await addDoc(alertsRef, {
    ...alert,
    timestamp: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Build a complete SOSAlert object (without Firestore timestamp — uses Date for testing).
 * Requirements: 1.7
 */
export function buildSOSAlert(
  patientId: string,
  wardId: string,
  selectedMessage: string,
): Omit<SOSAlert, 'timestamp'> {
  return {
    patientId,
    wardId,
    selectedMessage,
    deliveryStatus: 'pending',
    retryCount: 0,
  }
}

/** Minimum hold duration in milliseconds to trigger SOS (Requirements: 1.3) */
export const SOS_HOLD_THRESHOLD_MS = 2000

/**
 * Returns true if the hold duration meets the SOS trigger threshold.
 * Requirements: 1.3
 */
export function holdMeetsTriggerThreshold(holdDurationMs: number): boolean {
  return holdDurationMs >= SOS_HOLD_THRESHOLD_MS
}
