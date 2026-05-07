/**
 * Analytics Service
 * Requirement 22: Usage Analytics
 *
 * - Collects ONLY anonymized events (no userId, email, or name in records)
 * - Respects analyticsConsent flag stored at users/{userId}/analyticsConsent
 * - Provides opt-out mechanism (ceases collection when consent = false)
 * - Stores events at /analytics/events/{eventId}
 * - Provides aggregated stats for the admin dashboard
 */

import { firebaseApp, firebaseConfigured } from '@/firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  feature: string
  action: string
  sessionDuration?: number
  timestamp: number
  // NO userId, email, or name — fully anonymized (Requirement 22.4)
}

export interface FeedbackRecord {
  rating: number          // 1–5
  comment?: string
  feature: string
  timestamp: number
  // NO userId — anonymized
}

export interface AggregatedStats {
  totalEvents: number
  eventsByFeature: Record<string, number>
  averageSessionDuration: number
  feedbackCount: number
  averageRating: number
  ratingDistribution: Record<number, number>  // rating -> count
}

// ─── In-memory consent cache ──────────────────────────────────────────────────

const _consentCache = new Map<string, boolean>()

// ─── Consent helpers ──────────────────────────────────────────────────────────

/**
 * Reads the analyticsConsent flag for a user from Firestore.
 * Falls back to false (no consent) if Firestore is unavailable.
 */
export async function getAnalyticsConsent(userId: string): Promise<boolean> {
  if (_consentCache.has(userId)) return _consentCache.get(userId)!
  if (!firebaseConfigured) return false
  try {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    const snap = await getDoc(doc(db, 'users', userId))
    const consent = snap.exists() ? (snap.data()?.analyticsConsent ?? false) : false
    _consentCache.set(userId, consent)
    return consent
  } catch {
    return false
  }
}

/**
 * Persists the analyticsConsent flag for a user to Firestore.
 * Also updates the in-memory cache immediately.
 */
export async function setAnalyticsConsent(userId: string, consent: boolean): Promise<void> {
  _consentCache.set(userId, consent)
  if (!firebaseConfigured) return
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    await setDoc(doc(db, 'users', userId), { analyticsConsent: consent }, { merge: true })
  } catch (err) {
    console.warn('[analyticsService] Failed to persist consent:', err)
  }
}

/** Clears the in-memory consent cache (useful for testing). */
export function clearConsentCache(): void {
  _consentCache.clear()
}

// ─── Event logging ────────────────────────────────────────────────────────────

/**
 * Logs an anonymized analytics event.
 * If userId is provided, consent is checked first — no event is written if
 * the user has not consented (Requirement 22.2).
 * The stored record NEVER contains userId (Requirement 22.4).
 */
export async function logAnalyticsEvent(
  event: Omit<AnalyticsEvent, 'timestamp'>,
  userId?: string,
): Promise<void> {
  // Consent gate
  if (userId) {
    const consented = await getAnalyticsConsent(userId)
    if (!consented) return
  }

  const record: AnalyticsEvent = {
    ...event,
    timestamp: Date.now(),
    // Explicitly ensure no user-identifying fields leak in
  }

  // Defensive: strip any accidental user-identifying fields
  const safeRecord = stripUserIdentifiers(record)

  if (!firebaseConfigured) return
  try {
    const { getFirestore, collection, addDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    await addDoc(collection(db, 'analytics', 'events', 'records'), safeRecord)
  } catch (err) {
    console.warn('[analyticsService] Failed to log event:', err)
  }
}

/**
 * Removes any user-identifying fields from an analytics record.
 * This is a safety net — the callers should never include these fields.
 */
export function stripUserIdentifiers<T extends Record<string, unknown>>(record: T): T {
  const cleaned = { ...record }
  delete (cleaned as Record<string, unknown>).userId
  delete (cleaned as Record<string, unknown>).email
  delete (cleaned as Record<string, unknown>).name
  delete (cleaned as Record<string, unknown>).displayName
  return cleaned
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

/**
 * Submits a session feedback record (anonymized).
 * userId is used only for consent check — never stored in the record.
 */
export async function submitFeedback(
  feedback: Omit<FeedbackRecord, 'timestamp'>,
  userId?: string,
): Promise<void> {
  if (userId) {
    const consented = await getAnalyticsConsent(userId)
    if (!consented) return
  }

  const record: FeedbackRecord = {
    ...feedback,
    timestamp: Date.now(),
  }

  const safeRecord = stripUserIdentifiers(record as unknown as Record<string, unknown>) as unknown as FeedbackRecord

  if (!firebaseConfigured) return
  try {
    const { getFirestore, collection, addDoc } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)
    await addDoc(collection(db, 'analytics', 'feedback', 'records'), safeRecord)
  } catch (err) {
    console.warn('[analyticsService] Failed to submit feedback:', err)
  }
}

// ─── Aggregation (for admin dashboard) ───────────────────────────────────────

/**
 * Aggregates analytics events and feedback for the admin dashboard.
 * Returns totals, per-feature counts, average session duration,
 * feedback count, and average rating.
 */
export async function getAggregatedStats(): Promise<AggregatedStats> {
  const empty: AggregatedStats = {
    totalEvents: 0,
    eventsByFeature: {},
    averageSessionDuration: 0,
    feedbackCount: 0,
    averageRating: 0,
    ratingDistribution: {},
  }

  if (!firebaseConfigured) return empty

  try {
    const { getFirestore, collection, getDocs } = await import('firebase/firestore')
    const db = getFirestore(firebaseApp)

    // Fetch events
    const eventsSnap = await getDocs(collection(db, 'analytics', 'events', 'records'))
    const events: AnalyticsEvent[] = eventsSnap.docs.map((d) => d.data() as AnalyticsEvent)

    // Fetch feedback
    const feedbackSnap = await getDocs(collection(db, 'analytics', 'feedback', 'records'))
    const feedbacks: FeedbackRecord[] = feedbackSnap.docs.map((d) => d.data() as FeedbackRecord)

    return computeAggregatedStats(events, feedbacks)
  } catch (err) {
    console.warn('[analyticsService] Failed to fetch stats:', err)
    return empty
  }
}

/**
 * Pure aggregation function — computes stats from in-memory arrays.
 * Exported for testing (Property 25).
 */
export function computeAggregatedStats(
  events: AnalyticsEvent[],
  feedbacks: FeedbackRecord[],
): AggregatedStats {
  // Events aggregation
  const eventsByFeature: Record<string, number> = {}
  let totalDuration = 0
  let durationCount = 0

  for (const ev of events) {
    eventsByFeature[ev.feature] = (eventsByFeature[ev.feature] ?? 0) + 1
    if (ev.sessionDuration != null) {
      totalDuration += ev.sessionDuration
      durationCount++
    }
  }

  // Feedback aggregation
  const ratingDistribution: Record<number, number> = {}
  let ratingSum = 0

  for (const fb of feedbacks) {
    ratingDistribution[fb.rating] = (ratingDistribution[fb.rating] ?? 0) + 1
    ratingSum += fb.rating
  }

  const averageRating =
    feedbacks.length > 0
      ? Math.round((ratingSum / feedbacks.length) * 100) / 100
      : 0

  return {
    totalEvents: events.length,
    eventsByFeature,
    averageSessionDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    feedbackCount: feedbacks.length,
    averageRating,
    ratingDistribution,
  }
}
