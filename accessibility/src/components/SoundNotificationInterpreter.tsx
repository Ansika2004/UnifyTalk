/**
 * SoundNotificationInterpreter
 * Task 6.3.1 — Ambient sound detection (doorbell, alarm, phone ring patterns)
 * Task 6.3.2 — Visual alert with label identifying detected sound type
 *
 * Uses Web Audio API for microphone input and rule-based frequency analysis
 * to detect: doorbell (high-pitched ding ~1000–2000 Hz), alarm (repeating
 * beep ~800–1200 Hz), and phone ring (rhythmic pattern ~400–600 Hz).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { VisualAlert } from './VisualAlert'

// ─── Sound pattern definitions ────────────────────────────────────────────────

export type DetectedSoundType = 'doorbell' | 'alarm' | 'phone-ring' | null

interface SoundPattern {
  label: string
  /** Dominant frequency range [min, max] Hz */
  freqRange: [number, number]
  /** Minimum amplitude (0–255) to trigger detection */
  minAmplitude: number
  /** Emoji icon for the alert */
  icon: string
}

export const SOUND_PATTERNS: Record<Exclude<DetectedSoundType, null>, SoundPattern> = {
  // Phone ring: low rhythmic tone (350–650 Hz) — checked first (lowest range)
  'phone-ring': {
    label: 'Phone Ringing',
    freqRange: [350, 650],
    minAmplitude: 70,
    icon: '📱',
  },
  // Alarm: mid-range repeating beep (700–1100 Hz)
  alarm: {
    label: 'Alarm',
    freqRange: [700, 1100],
    minAmplitude: 100,
    icon: '🚨',
  },
  // Doorbell: high-pitched ding (1200–2200 Hz) — distinct from alarm
  doorbell: {
    label: 'Doorbell',
    freqRange: [1200, 2200],
    minAmplitude: 80,
    icon: '🔔',
  },
}

// ─── Frequency analysis helpers ───────────────────────────────────────────────

/**
 * Given an FFT frequency data array and the sample rate, returns the
 * dominant frequency bin's Hz value and its amplitude.
 */
function getDominantFrequency(
  dataArray: Uint8Array,
  sampleRate: number,
): { frequency: number; amplitude: number } {
  const binCount = dataArray.length
  let maxAmplitude = 0
  let maxIndex = 0

  for (let i = 0; i < binCount; i++) {
    if (dataArray[i] > maxAmplitude) {
      maxAmplitude = dataArray[i]
      maxIndex = i
    }
  }

  // Each bin covers sampleRate / (2 * binCount) Hz
  const frequency = (maxIndex * sampleRate) / (2 * binCount)
  return { frequency, amplitude: maxAmplitude }
}

/**
 * Classify a dominant frequency + amplitude against known sound patterns.
 * Returns the first matching sound type, or null.
 */
export function classifySound(
  frequency: number,
  amplitude: number,
): DetectedSoundType {
  for (const [type, pattern] of Object.entries(SOUND_PATTERNS) as [
    Exclude<DetectedSoundType, null>,
    SoundPattern,
  ][]) {
    const [min, max] = pattern.freqRange
    if (frequency >= min && frequency <= max && amplitude >= pattern.minAmplitude) {
      return type
    }
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SoundNotificationInterpreterProps {
  /** Poll interval in ms for frequency analysis (default 200ms) */
  pollIntervalMs?: number
  /** Cooldown in ms before the same sound can be re-detected (default 3000ms) */
  cooldownMs?: number
}

export function SoundNotificationInterpreter({
  pollIntervalMs = 200,
  cooldownMs = 3000,
}: SoundNotificationInterpreterProps) {
  const [isListening, setIsListening] = useState(false)
  const [detectedSound, setDetectedSound] = useState<DetectedSoundType>(null)
  const [alertActive, setAlertActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastDetectedRef = useRef<{ type: DetectedSoundType; time: number }>({
    type: null,
    time: 0,
  })

  const stopListening = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setIsListening(false)
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioContextRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      pollTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)

        const { frequency, amplitude } = getDominantFrequency(
          dataArray,
          ctx.sampleRate,
        )
        const soundType = classifySound(frequency, amplitude)

        if (soundType) {
          const now = Date.now()
          const last = lastDetectedRef.current
          // Cooldown: don't re-trigger the same sound within cooldownMs
          if (soundType !== last.type || now - last.time > cooldownMs) {
            lastDetectedRef.current = { type: soundType, time: now }
            setDetectedSound(soundType)
            setAlertActive(true)
          }
        }
      }, pollIntervalMs)

      setIsListening(true)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access denied or unavailable.'
      setError(`Could not start sound detection: ${msg}`)
    }
  }, [cooldownMs, pollIntervalMs])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const dismissAlert = useCallback(() => {
    setAlertActive(false)
    setDetectedSound(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  const soundInfo = detectedSound ? SOUND_PATTERNS[detectedSound] : null
  const alertMessage = soundInfo
    ? `${soundInfo.icon} ${soundInfo.label} detected`
    : ''

  return (
    <section
      aria-labelledby="sni-heading"
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2
        id="sni-heading"
        className="mb-3 text-lg font-semibold text-gray-900"
      >
        Sound Notification Interpreter
      </h2>

      <p className="mb-4 text-sm text-gray-600">
        Detects ambient sounds (doorbell, alarm, phone ring) and shows a visual
        alert so you never miss an important sound.
      </p>

      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleListening}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop listening for sounds' : 'Start listening for sounds'}
        className={[
          'flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg px-4 py-2',
          'font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          isListening
            ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        ].join(' ')}
      >
        <span aria-hidden="true">{isListening ? '🎙️' : '🎤'}</span>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      {/* Status indicator */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Sound detection status"
        className="mt-3 text-sm"
      >
        {isListening ? (
          <span className="flex items-center gap-1 text-green-700">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"
            />
            Listening for sounds…
          </span>
        ) : (
          <span className="text-gray-500">Not listening</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Detected sound patterns legend */}
      <div className="mt-4" aria-label="Detectable sound types">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Detectable sounds
        </p>
        <ul className="space-y-1" role="list">
          {(Object.entries(SOUND_PATTERNS) as [Exclude<DetectedSoundType, null>, SoundPattern][]).map(
            ([type, pattern]) => (
              <li
                key={type}
                className="flex items-center gap-2 text-sm text-gray-700"
                aria-label={`${pattern.label}: frequency range ${pattern.freqRange[0]} to ${pattern.freqRange[1]} Hz`}
              >
                <span aria-hidden="true">{pattern.icon}</span>
                <span>{pattern.label}</span>
                <span className="text-xs text-gray-400">
                  ({pattern.freqRange[0]}–{pattern.freqRange[1]} Hz)
                </span>
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Visual alert overlay — task 6.3.2 */}
      {alertActive && detectedSound && (
        <VisualAlert
          active={alertActive}
          message={alertMessage}
          intensity="strong"
          onDismiss={dismissAlert}
        />
      )}
    </section>
  )
}
