/**
 * useFCMVisualAlert
 * Task 6.3.3 — Wires FCM push notifications to the VisualAlert component.
 *
 * Usage:
 *   const { alert, dismiss } = useFCMVisualAlert()
 *   // Render: <VisualAlert active={alert?.active} message={alert?.message} onDismiss={dismiss} />
 */
import { useEffect, useState, useCallback } from 'react'
import { initFCMListener, onFCMNotification, type FCMNotificationPayload } from '@/services/fcmNotificationService'
import type { FlashIntensity } from '@/types'

export interface FCMAlertState {
  active: boolean
  message: string
  intensity: FlashIntensity
}

export function useFCMVisualAlert() {
  const [alert, setAlert] = useState<FCMAlertState | null>(null)

  useEffect(() => {
    // Start the FCM listener (no-op if already running or not configured)
    initFCMListener().catch(() => {})

    const unsubscribe = onFCMNotification((payload: FCMNotificationPayload) => {
      const message = [payload.title, payload.body].filter(Boolean).join(': ')
      setAlert({ active: true, message, intensity: 'moderate' })
    })

    return unsubscribe
  }, [])

  const dismiss = useCallback(() => {
    setAlert(null)
  }, [])

  return { alert, dismiss }
}
