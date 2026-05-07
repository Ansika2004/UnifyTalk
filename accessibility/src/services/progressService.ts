import type { PracticeSession } from '@/types'
import { firebaseConfigured, firebaseApp } from '@/firebase'

const SESSIONS_KEY = 'practice_sessions_cache'

export interface ProgressSummary {
  period: '7d' | '30d' | 'all'
  totalSessions: number
  totalDurationSeconds: number
  averageAccuracy: number
  milestoneReached: boolean
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadAllSessions(): PracticeSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as PracticeSession[]
  } catch {
    return []
  }
}

function persistSessions(sessions: PracticeSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch { /* ignore quota errors */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed practice session.
 * Saves to localStorage cache and, when Firebase is configured, to
 * Firestore at users/{userId}/sessions/{sessionId}.
 */
export async function recordSession(session: PracticeSession): Promise<void> {
  // 1. Persist locally
  const sessions = loadAllSessions()
  const existing = sessions.findIndex((s) => s.id === session.id)
  if (existing >= 0) {
    sessions[existing] = session
  } else {
    sessions.push(session)
  }
  persistSessions(sessions)

  // 2. Persist to Firestore when available
  if (firebaseConfigured) {
    try {
      const { getFirestore, doc, setDoc } = await import('firebase/firestore')
      const db = getFirestore(firebaseApp)
      await setDoc(
        doc(db, 'users', session.userId, 'sessions', session.id),
        session,
      )
    } catch {
      // Firestore write failure is non-fatal — data is already in localStorage
    }
  }
}

/**
 * Load all sessions for a user from the localStorage cache.
 * (Firestore sync is handled separately via recordSession.)
 */
export function getSessions(_userId?: string): PracticeSession[] {
  return loadAllSessions()
}

/**
 * Compute a ProgressSummary for the given sessions and period.
 * Only sessions within the period window are counted.
 */
export function computeSummary(
  sessions: PracticeSession[],
  period: '7d' | '30d' | 'all' = 'all',
  threshold = 0.8,
): ProgressSummary {
  const now = Date.now()
  const cutoffMs =
    period === '7d'
      ? now - 7 * 24 * 60 * 60 * 1000
      : period === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0

  const filtered = period === 'all' ? sessions : sessions.filter((s) => s.date >= cutoffMs)

  const totalSessions = filtered.length
  const totalDurationSeconds = filtered.reduce((sum, s) => sum + s.durationSeconds, 0)
  const averageAccuracy =
    totalSessions > 0
      ? filtered.reduce((sum, s) => sum + s.accuracyScore, 0) / totalSessions
      : 0

  return {
    period,
    totalSessions,
    totalDurationSeconds,
    averageAccuracy,
    milestoneReached: checkMilestone(filtered, threshold),
  }
}

/**
 * Returns true if any session in the list has accuracyScore ≥ threshold.
 * Default threshold is 0.8 (80 %).
 */
export function checkMilestone(sessions: PracticeSession[], threshold = 0.8): boolean {
  if (sessions.length === 0) return false
  return sessions.some((s) => s.accuracyScore >= threshold)
}

/**
 * Serialise sessions to a CSV string.
 * Headers: date,type,durationSeconds,accuracyScore
 */
export function exportToCSV(sessions: PracticeSession[]): string {
  const header = 'date,type,durationSeconds,accuracyScore'
  const rows = sessions.map((s) => {
    const dateStr = new Date(s.date).toISOString()
    return `${dateStr},${s.type},${s.durationSeconds},${s.accuracyScore}`
  })
  return [header, ...rows].join('\n')
}
