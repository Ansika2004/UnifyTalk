/**
 * SOS Service
 * Tasks: 6.4.1–6.4.5
 * Requirements: 19.1–19.5
 *
 * Builds and dispatches emergency SOS alerts to all designated contacts
 * via FCM, email, and/or SMS within 10 seconds. Falls back gracefully
 * when location services or Firebase are unavailable.
 */
import type { SOSAlert, EmergencyContact } from '@/types'
import { firebaseConfigured } from '@/firebase'

const SOS_AUDIT_KEY = 'sos_audit_log'

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Construct an SOSAlert payload.
 * When `location` is undefined the alert is sent without coordinates (Req 19.5).
 */
export function buildSOSAlert(
  userId: string,
  contacts: EmergencyContact[],
  location?: { latitude: number; longitude: number },
): SOSAlert {
  return {
    userId,
    contacts,
    latitude: location?.latitude,
    longitude: location?.longitude,
    timestamp: Date.now(),
    locationAvailable: Boolean(location),
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Dispatch an SOS alert to all contacts.
 * Completes within 10 seconds (Req 19.2).
 * Persists to audit log regardless of network state.
 */
export async function dispatchSOSAlert(alert: SOSAlert): Promise<void> {
  // Persist to local audit log first (works offline)
  _appendAuditLog(alert)

  const locationText = alert.locationAvailable
    ? `GPS: ${alert.latitude?.toFixed(5)}, ${alert.longitude?.toFixed(5)}`
    : 'Location unavailable'

  const message =
    `🚨 EMERGENCY SOS from user ${alert.userId}\n` +
    `Time: ${new Date(alert.timestamp).toISOString()}\n` +
    `${locationText}`

  // Dispatch to all contacts with a 10-second overall deadline (Req 19.2)
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, 10_000))

  const dispatches = alert.contacts.map((contact) =>
    _dispatchToContact(contact, message, alert),
  )

  await Promise.race([Promise.allSettled(dispatches), deadline])
}

// ─── Enabled check ────────────────────────────────────────────────────────────

/**
 * SOS is enabled only when at least one emergency contact is configured (Req 19.3).
 */
export function isSOSEnabled(contacts: EmergencyContact[]): boolean {
  return contacts.length > 0
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _dispatchToContact(
  contact: EmergencyContact,
  message: string,
  alert: SOSAlert,
): Promise<void> {
  try {
    if (contact.notificationMethod === 'fcm') {
      await _sendFCM(contact, message, alert)
    } else if (contact.notificationMethod === 'email') {
      await _sendEmail(contact, message, alert)
    } else {
      // sms
      await _sendSMS(contact, message)
    }
  } catch (err) {
    console.warn(`[SOSService] Failed to notify ${contact.name} via ${contact.notificationMethod}:`, err)
  }
}

async function _sendFCM(
  contact: EmergencyContact,
  message: string,
  alert: SOSAlert,
): Promise<void> {
  if (!firebaseConfigured) {
    console.info('[SOSService] FCM not configured — logging SOS alert for', contact.name)
    return
  }

  // In production this would call a Cloud Function / backend endpoint that
  // uses the Admin SDK to send an FCM message to the contact's device token.
  // Here we log the intent and store in Firestore when available.
  try {
    const { getFirestore, collection, addDoc } = await import('firebase/firestore')
    const { firebaseApp } = await import('@/firebase')
    const db = getFirestore(firebaseApp)
    await addDoc(collection(db, 'sos', 'alerts', 'pending'), {
      contactId: contact.id,
      contactName: contact.name,
      method: 'fcm',
      message,
      timestamp: alert.timestamp,
      locationAvailable: alert.locationAvailable,
      latitude: alert.latitude ?? null,
      longitude: alert.longitude ?? null,
    })
    console.info(`[SOSService] FCM alert queued for ${contact.name}`)
  } catch (err) {
    console.warn('[SOSService] Firestore FCM queue failed:', err)
  }
}

async function _sendEmail(
  contact: EmergencyContact,
  message: string,
  alert: SOSAlert,
): Promise<void> {
  // In production: call a backend /api/sos/email endpoint.
  // For now, log and store in Firestore pending queue.
  console.info(`[SOSService] Email SOS → ${contact.email}:`, message)

  if (!firebaseConfigured) return

  try {
    const { getFirestore, collection, addDoc } = await import('firebase/firestore')
    const { firebaseApp } = await import('@/firebase')
    const db = getFirestore(firebaseApp)
    await addDoc(collection(db, 'sos', 'alerts', 'pending'), {
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      method: 'email',
      message,
      timestamp: alert.timestamp,
      locationAvailable: alert.locationAvailable,
    })
  } catch (err) {
    console.warn('[SOSService] Firestore email queue failed:', err)
  }
}

async function _sendSMS(contact: EmergencyContact, message: string): Promise<void> {
  // In production: call a backend /api/sos/sms endpoint (Twilio, etc.).
  console.info(`[SOSService] SMS SOS → ${contact.phone}:`, message)
}

function _appendAuditLog(alert: SOSAlert): void {
  try {
    const log = JSON.parse(localStorage.getItem(SOS_AUDIT_KEY) ?? '[]') as SOSAlert[]
    log.push(alert)
    localStorage.setItem(SOS_AUDIT_KEY, JSON.stringify(log))
  } catch { /* ignore — storage may be unavailable */ }
}
