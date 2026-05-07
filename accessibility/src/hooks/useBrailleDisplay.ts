/**
 * useBrailleDisplay — React hook for braille display integration.
 *
 * Provides:
 *  - connect / disconnect actions
 *  - isConnected state
 *  - sendToBraille for real-time text transmission
 *  - Visual + audio notification on device disconnect (Req 10.3)
 *
 * Gracefully degrades to no-ops when WebHID is not supported.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  connectBrailleDisplay,
  disconnectBrailleDisplay,
  isBrailleConnected,
  sendToBraille,
  onBrailleDisconnect,
} from '@/services/brailleService'
import { ttsEngine } from '@/services/ttsEngine'
import type { FlashIntensity } from '@/types'

const DISCONNECT_MESSAGE = 'Braille display disconnected. Continuing without braille output.'

export interface BrailleDisplayHook {
  /** Whether a braille display is currently connected */
  isConnected: boolean
  /** Request HID access and open the braille display */
  connect: () => Promise<void>
  /** Close the braille display connection */
  disconnect: () => Promise<void>
  /** Send text to the braille display in real time */
  send: (text: string) => Promise<void>
  /** Visual alert state — set when device disconnects */
  disconnectAlert: { active: boolean; message: string; intensity: FlashIntensity } | null
  /** Dismiss the disconnect alert */
  dismissAlert: () => void
}

export function useBrailleDisplay(): BrailleDisplayHook {
  const [isConnected, setIsConnected] = useState<boolean>(isBrailleConnected())
  const [disconnectAlert, setDisconnectAlert] = useState<{
    active: boolean
    message: string
    intensity: FlashIntensity
  } | null>(null)

  // Keep a stable ref to avoid stale closures in the disconnect handler
  const alertRef = useRef(setDisconnectAlert)
  alertRef.current = setDisconnectAlert

  useEffect(() => {
    // Subscribe to braille disconnect events
    const unsubscribe = onBrailleDisconnect(() => {
      setIsConnected(false)

      // Req 10.3 — visual notification
      alertRef.current({
        active: true,
        message: DISCONNECT_MESSAGE,
        intensity: 'strong',
      })

      // Req 10.3 — audio notification via TTS
      ttsEngine.speak(DISCONNECT_MESSAGE)
    })

    return unsubscribe
  }, [])

  const connect = useCallback(async () => {
    const device = await connectBrailleDisplay()
    setIsConnected(device !== null && device.opened)
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectBrailleDisplay()
    setIsConnected(false)
  }, [])

  const send = useCallback(async (text: string) => {
    await sendToBraille(text)
  }, [])

  const dismissAlert = useCallback(() => {
    setDisconnectAlert(null)
  }, [])

  return { isConnected, connect, disconnect, send, disconnectAlert, dismissAlert }
}
