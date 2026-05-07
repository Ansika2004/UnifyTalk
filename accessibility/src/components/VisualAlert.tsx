import { useEffect, useState, useCallback } from 'react'
import type { FlashIntensity } from '@/types'

// Minimum flash interval per WCAG 2.3.1 (≤3 flashes/sec)
export const MIN_FLASH_INTERVAL_MS = 333

interface VisualAlertProps {
  /** Whether the alert is active and should flash */
  active?: boolean
  message?: string
  intensity?: FlashIntensity
  onDismiss?: () => void
  /** Flash interval in ms — enforced to be ≥333ms */
  flashIntervalMs?: number
}

/**
 * Opacity values per intensity level.
 * subtle: 0.3, moderate: 0.6, strong: 1.0
 */
const INTENSITY_OPACITY: Record<FlashIntensity, number> = {
  subtle: 0.3,
  moderate: 0.6,
  strong: 1.0,
}

export function VisualAlert({
  active = true,
  message = '',
  intensity = 'moderate',
  onDismiss,
  flashIntervalMs,
}: VisualAlertProps) {
  const [visible, setVisible] = useState(true)
  const [flashOn, setFlashOn] = useState(true)

  // Enforce ≥333ms flash interval per WCAG 2.3.1
  const safeInterval = Math.max(flashIntervalMs ?? MIN_FLASH_INTERVAL_MS, MIN_FLASH_INTERVAL_MS)

  useEffect(() => {
    if (!active) return
    const flashTimer = setInterval(() => {
      setFlashOn((v) => !v)
    }, safeInterval)
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 5000)
    return () => {
      clearInterval(flashTimer)
      clearTimeout(dismissTimer)
    }
  }, [active, onDismiss, safeInterval])

  const dismiss = useCallback(() => {
    setVisible(false)
    onDismiss?.()
  }, [onDismiss])

  if (!active || !visible) return null

  // When flashing on, use the intensity opacity; when off, use a low base opacity
  const currentOpacity = flashOn ? INTENSITY_OPACITY[intensity] : 0.1

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-flash-interval={safeInterval}
      data-intensity={intensity}
      style={{ opacity: currentOpacity }}
      className={[
        'fixed top-4 left-4 right-4 z-[9997]',
        'bg-yellow-400 text-black rounded-lg p-4',
        'shadow-lg font-semibold transition-opacity',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        {message && <span>{message}</span>}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss alert"
          className="text-black hover:text-gray-700 font-bold text-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** Hook to imperatively trigger a visual alert */
export function useVisualAlert() {
  const [alert, setAlert] = useState<{
    message: string
    intensity?: FlashIntensity
    active: boolean
  } | null>(null)

  const trigger = useCallback((message: string, intensity: FlashIntensity = 'moderate') => {
    setAlert({ message, intensity, active: true })
  }, [])

  const dismiss = useCallback(() => {
    setAlert(null)
  }, [])

  return { alert, trigger, dismiss }
}
