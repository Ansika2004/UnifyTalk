/**
 * Mood_Analyzer — evaluates check-in responses via Claude API and classifies
 * the patient's emotional state. Handles FCM stub notifications for distress
 * and IndexedDB retry on API failure.
 * Requirements: 4.3, 4.4, 4.5, 4.7
 */

import type { CheckIn, CheckInResponse } from '../types'
import { enqueueDraft } from './checkinDraftQueue'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-3-haiku-20240307'
const MAX_TOKENS = 128

/**
 * Pure function: classify an average score into a distress level.
 * Score ≤ 1.5 → severe_distress
 * Score ≤ 2.5 → moderate_distress
 * Score ≤ 3.5 → mild_distress
 * Score  > 3.5 → calm
 * Requirements: 4.3
 */
export function classifyFromScore(avgScore: number): CheckIn['classification'] {
  if (avgScore <= 1.5) return 'severe_distress'
  if (avgScore <= 2.5) return 'moderate_distress'
  if (avgScore <= 3.5) return 'mild_distress'
  return 'calm'
}

/**
 * Call Claude API with structured check-in responses and return a classification.
 * Falls back to score-based classification if the API response is not a valid label.
 * Requirements: 4.3
 */
export async function analyzeMood(
  responses: CheckInResponse[]
): Promise<CheckIn['classification']> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY as string

  const summary = responses
    .map((r) => `Q${r.questionId}: ${r.value} (via ${r.modality})`)
    .join('; ')

  const prompt =
    `You are a clinical mood classifier. Given these patient check-in responses: ${summary}\n` +
    `Classify the patient's emotional state as exactly one of: calm, mild_distress, moderate_distress, severe_distress.\n` +
    `Reply with only the classification label, nothing else.`

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const label = (data.content?.[0]?.text ?? '').trim() as string

  const valid: CheckIn['classification'][] = [
    'calm',
    'mild_distress',
    'moderate_distress',
    'severe_distress',
  ]
  if (valid.includes(label as CheckIn['classification'])) {
    return label as CheckIn['classification']
  }

  // Fallback: derive from average numeric value
  const numericValues = responses
    .map((r) => (typeof r.value === 'number' ? r.value : parseFloat(String(r.value))))
    .filter((v) => !isNaN(v))

  const avg =
    numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : 3

  return classifyFromScore(avg)
}

export interface FCMNotificationPayload {
  patientId: string
  roomNumber: string
  classification: CheckIn['classification']
  consecutiveDays: number
}

/**
 * Send a stub FCM notification for moderate/severe distress.
 * Logs to console and writes to Firestore /notifications/{id}.
 * Requirements: 4.4
 */
export async function sendDistressNotification(
  payload: FCMNotificationPayload
): Promise<void> {
  const { patientId, roomNumber, classification, consecutiveDays } = payload

  const message = `Patient in Room ${roomNumber} has reported feeling very anxious for ${consecutiveDays} consecutive day(s).`

  // Stub: log to console (real FCM would go via Cloud Function)
  console.log('[FCM STUB] Distress notification:', { patientId, classification, message })

  // Write to Firestore /notifications/{id}
  try {
    const { getFirestore, collection, addDoc, Timestamp } = await import('firebase/firestore')
    const { firebaseApp } = await import('../firebase')
    const db = getFirestore(firebaseApp)
    await addDoc(collection(db, 'notifications'), {
      patientId,
      roomNumber,
      classification,
      message,
      consecutiveDays,
      sentAt: Timestamp.now(),
      type: 'mood_distress',
    })
  } catch (err) {
    console.error('[FCM STUB] Failed to write notification to Firestore:', err)
  }
}

/**
 * Determine if a classification requires a staff notification.
 * Requirements: 4.4
 */
export function requiresNotification(
  classification: CheckIn['classification']
): boolean {
  return classification === 'moderate_distress' || classification === 'severe_distress'
}

/**
 * Analyze mood with full error handling:
 * - On API failure: store raw responses in IndexedDB checkin_drafts, schedule retry after 5 min
 * - On moderate/severe: trigger FCM stub notification
 * Requirements: 4.3, 4.4, 4.7
 */
export async function analyzeMoodWithFallback(
  patientId: string,
  responses: CheckInResponse[],
  notificationPayload: Omit<FCMNotificationPayload, 'classification'>
): Promise<{ classification: CheckIn['classification'] | null; stored: boolean }> {
  try {
    const classification = await analyzeMood(responses)

    if (requiresNotification(classification)) {
      // Fire-and-forget within 60s — schedule immediately
      setTimeout(() => {
        sendDistressNotification({ ...notificationPayload, classification }).catch(
          (err) => console.error('[MoodAnalyzer] FCM notification failed:', err)
        )
      }, 0)
    }

    return { classification, stored: false }
  } catch (err) {
    console.error('[MoodAnalyzer] API call failed, storing draft for retry:', err)

    await enqueueDraft({
      patientId,
      responses,
      savedAt: Date.now(),
    })

    // Schedule retry after 5 minutes
    setTimeout(() => {
      analyzeMoodWithFallback(patientId, responses, notificationPayload).catch(
        (retryErr) => console.error('[MoodAnalyzer] Retry failed:', retryErr)
      )
    }, 5 * 60 * 1000)

    return { classification: null, stored: true }
  }
}
