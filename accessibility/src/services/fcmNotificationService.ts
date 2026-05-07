/**
 * FCM Notification Service
 * Task 6.3.3 — FCM integration for push notification visual alerts
 *
 * Listens for incoming Firebase Cloud Messaging push notifications and
 * triggers the VisualAlert component when a notification arrives.
 * Falls back gracefully when FCM is not configured.
 */
import { firebaseApp, firebaseConfigured } from '@/firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FCMNotificationPayload {
  title: string
  body: string
  /** Optional icon URL */
  icon?: string
  /** Optional data payload */
  data?: Record<string, string>
}

export type FCMNotificationHandler = (payload: FCMNotificationPayload) => void

// ─── Internal state ───────────────────────────────────────────────────────────

let _unsubscribe: (() => void) | null = null
const _handlers: Set<FCMNotificationHandler> = new Set()

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a handler that will be called whenever an FCM notification arrives.
 * Returns an unsubscribe function.
 */
export function onFCMNotification(handler: FCMNotificationHandler): () => void {
  _handlers.add(handler)
  return () => {
    _handlers.delete(handler)
  }
}

/**
 * Initialise the FCM foreground message listener.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Falls back gracefully when FCM is not configured or the browser
 * does not support service workers.
 */
export async function initFCMListener(): Promise<void> {
  if (_unsubscribe) return // already initialised

  if (!firebaseConfigured) {
    // FCM requires a real API key — skip silently in demo/dev mode
    console.info('[FCM] Firebase not configured — push notifications disabled.')
    return
  }

  if (!('serviceWorker' in navigator)) {
    console.info('[FCM] Service workers not supported — push notifications disabled.')
    return
  }

  try {
    // Dynamic import so the FCM SDK is only loaded when needed
    const { getMessaging, onMessage } = await import('firebase/messaging')
    const messaging = getMessaging(firebaseApp)

    _unsubscribe = onMessage(messaging, (remoteMessage) => {
      const payload: FCMNotificationPayload = {
        title: remoteMessage.notification?.title ?? 'Notification',
        body: remoteMessage.notification?.body ?? '',
        icon: remoteMessage.notification?.icon,
        data: remoteMessage.data as Record<string, string> | undefined,
      }
      _dispatchNotification(payload)
    })

    console.info('[FCM] Foreground message listener active.')
  } catch (err) {
    // Non-fatal — app continues without push notifications
    console.warn('[FCM] Could not initialise messaging:', err)
  }
}

/**
 * Request notification permission and return the FCM registration token.
 * Returns null when FCM is not configured or permission is denied.
 */
export async function requestFCMToken(vapidKey?: string): Promise<string | null> {
  if (!firebaseConfigured) return null

  try {
    const { getMessaging, getToken } = await import('firebase/messaging')
    const messaging = getMessaging(firebaseApp)
    const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined)
    return token ?? null
  } catch (err) {
    console.warn('[FCM] Could not get registration token:', err)
    return null
  }
}

/**
 * Stop the FCM foreground listener and clear all handlers.
 */
export function teardownFCMListener(): void {
  _unsubscribe?.()
  _unsubscribe = null
  _handlers.clear()
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _dispatchNotification(payload: FCMNotificationPayload): void {
  _handlers.forEach((handler) => {
    try {
      handler(payload)
    } catch (err) {
      console.error('[FCM] Handler error:', err)
    }
  })
}
