/**
 * Buddy System Service
 * Tasks: 6.6.1–6.6.5
 * Requirements: 17.1–17.4
 *
 * Matches users with volunteer communication buddies based on disability type,
 * language, and availability. Handles timeout fallback and post-session ratings.
 */
import type { DisabilityType } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuddyMatchRequest {
  requestId: string
  userId: string
  disabilityTypes: DisabilityType[]
  language: string
  requestedAt: number
}

export interface VolunteerProfile {
  volunteerId: string
  name: string
  supportedDisabilityTypes: DisabilityType[]
  languages: string[]
  communicationPreferences: string[]
  available: boolean
}

export interface BuddyMatch {
  requestId: string
  userId: string
  volunteer: VolunteerProfile
  matchedAt: number
  sessionId: string
}

export type MatchStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'timeout'
  | 'cancelled'
  | 'session_ended'

const RATINGS_KEY = 'buddy_ratings'
const REQUESTS_KEY = 'buddy_requests'

// ─── Simulated volunteer pool ─────────────────────────────────────────────────

const VOLUNTEER_POOL: VolunteerProfile[] = [
  {
    volunteerId: 'v1',
    name: 'Alex Rivera',
    supportedDisabilityTypes: ['deaf', 'hard-of-hearing'],
    languages: ['en', 'es'],
    communicationPreferences: ['text', 'sign-language'],
    available: true,
  },
  {
    volunteerId: 'v2',
    name: 'Sam Chen',
    supportedDisabilityTypes: ['mute', 'non-verbal'],
    languages: ['en', 'zh'],
    communicationPreferences: ['pictogram', 'text'],
    available: true,
  },
  {
    volunteerId: 'v3',
    name: 'Priya Nair',
    supportedDisabilityTypes: ['blind', 'low-vision'],
    languages: ['en', 'hi'],
    communicationPreferences: ['voice', 'text'],
    available: true,
  },
  {
    volunteerId: 'v4',
    name: 'Jordan Lee',
    supportedDisabilityTypes: ['deaf', 'hard-of-hearing', 'mute', 'non-verbal'],
    languages: ['en', 'fr', 'de'],
    communicationPreferences: ['text', 'sign-language', 'pictogram'],
    available: true,
  },
]

// ─── Core matching logic ──────────────────────────────────────────────────────

/**
 * Find a volunteer that matches the user's disability types and language.
 * Returns null if no match found (Req 17.1).
 */
export function findMatchingVolunteer(
  disabilityTypes: DisabilityType[],
  language: string,
): VolunteerProfile | null {
  const langCode = language.split('-')[0].toLowerCase()

  return (
    VOLUNTEER_POOL.find((v) => {
      if (!v.available) return false
      const supportsDisability =
        disabilityTypes.length === 0 ||
        disabilityTypes.some((d) => v.supportedDisabilityTypes.includes(d))
      const supportsLanguage = v.languages.some(
        (l) => l.toLowerCase() === langCode || l.toLowerCase().startsWith(langCode),
      )
      return supportsDisability && supportsLanguage
    }) ?? null
  )
}

/**
 * Request a buddy match. Simulates async volunteer lookup.
 * Resolves with a BuddyMatch if found within the timeout, or null on timeout.
 * Req 17.1: match within 5 minutes.
 */
export async function requestBuddyMatch(
  userId: string,
  disabilityTypes: DisabilityType[],
  language: string,
): Promise<BuddyMatch | null> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const request: BuddyMatchRequest = {
    requestId,
    userId,
    disabilityTypes,
    language,
    requestedAt: Date.now(),
  }

  // Persist request
  _saveRequest(request)

  // Simulate a short async delay (real impl would poll/subscribe to Firestore)
  await new Promise((r) => setTimeout(r, 800))

  const volunteer = findMatchingVolunteer(disabilityTypes, language)
  if (!volunteer) return null

  const match: BuddyMatch = {
    requestId,
    userId,
    volunteer,
    matchedAt: Date.now(),
    sessionId: `session_${Date.now()}`,
  }

  return match
}

/**
 * Cancel a pending match request (Req 17.1).
 */
export function cancelMatch(requestId: string): void {
  try {
    const requests = _loadRequests()
    const updated = requests.filter((r) => r.requestId !== requestId)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

// ─── Rating ───────────────────────────────────────────────────────────────────

export interface SessionRating {
  sessionId: string
  userId: string
  rating: number  // 1–5
  ratedAt: number
}

/**
 * Submit a 1–5 star rating for a completed buddy session (Req 17.3).
 */
export function submitRating(sessionId: string, rating: number, userId = 'local-user'): void {
  if (rating < 1 || rating > 5) {
    throw new RangeError(`Rating must be between 1 and 5, got ${rating}`)
  }
  const entry: SessionRating = { sessionId, userId, rating, ratedAt: Date.now() }
  try {
    const existing = _loadRatings()
    const updated = existing.filter((r) => r.sessionId !== sessionId)
    updated.push(entry)
    localStorage.setItem(RATINGS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

/**
 * Load all stored ratings.
 */
export function loadRatings(): SessionRating[] {
  return _loadRatings()
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _loadRatings(): SessionRating[] {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '[]') as SessionRating[]
  } catch {
    return []
  }
}

function _saveRequest(request: BuddyMatchRequest): void {
  try {
    const requests = _loadRequests()
    requests.push(request)
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
  } catch { /* ignore */ }
}

function _loadRequests(): BuddyMatchRequest[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) ?? '[]') as BuddyMatchRequest[]
  } catch {
    return []
  }
}
