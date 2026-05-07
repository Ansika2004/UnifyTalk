/**
 * NoiseDetector — samples ambient audio every 500ms via Web Audio API AnalyserNode,
 * computes dB level, and switches input mode based on noise thresholds.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import { useEffect, useRef, useState } from 'react'
import { useGlobalStore, selectSetActiveInputMode } from '../store/globalStore'
import { computeNoiseLevel } from './noiseThreshold'

const SAMPLE_INTERVAL_MS = 500
const HIGH_NOISE_THRESHOLD_DB = 65
const LOW_NOISE_THRESHOLD_DB = 55
const CONSECUTIVE_HIGH_FOR_TOUCH = 3
const CONSECUTIVE_LOW_FOR_VOICE = 5

export default function NoiseDetector() {
  const setActiveInputMode = useGlobalStore(selectSetActiveInputMode)

  const [currentDb, setCurrentDb] = useState(0)
  const [level, setLevel] = useState<'green' | 'yellow' | 'red'>('green')
  const [showNoisyBanner, setShowNoisyBanner] = useState(false)
  const [showVoicePrompt, setShowVoicePrompt] = useState(false)
  const [micDenied, setMicDenied] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const consecutiveHighRef = useRef(0)
  const consecutiveLowRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    initMicrophone()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [])

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioCtxRef.current) audioCtxRef.current.close()
  }

  async function initMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      timerRef.current = setInterval(() => {
        if (!mountedRef.current) return
        sampleNoise()
      }, SAMPLE_INTERVAL_MS)
    } catch {
      if (mountedRef.current) {
        setMicDenied(true)
        setActiveInputMode('touch')
      }
    }
  }

  function sampleNoise() {
    const analyser = analyserRef.current
    if (!analyser) return

    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const avg = data.reduce((s, v) => s + v, 0) / data.length
    // Map 0–255 to approximate 0–90 dB
    const db = Math.round((avg / 255) * 90)

    setCurrentDb(db)
    setLevel(computeNoiseLevel(db))

    if (db > HIGH_NOISE_THRESHOLD_DB) {
      consecutiveHighRef.current += 1
      consecutiveLowRef.current = 0
    } else if (db < LOW_NOISE_THRESHOLD_DB) {
      consecutiveLowRef.current += 1
      consecutiveHighRef.current = 0
    } else {
      consecutiveHighRef.current = 0
      consecutiveLowRef.current = 0
    }

    if (consecutiveHighRef.current >= CONSECUTIVE_HIGH_FOR_TOUCH) {
      setActiveInputMode('touch')
      setShowNoisyBanner(true)
      setShowVoicePrompt(false)
      consecutiveHighRef.current = 0
    }

    if (consecutiveLowRef.current >= CONSECUTIVE_LOW_FOR_VOICE) {
      setShowVoicePrompt(true)
      consecutiveLowRef.current = 0
    }
  }

  function handleEnableVoice() {
    setActiveInputMode('voice')
    setShowVoicePrompt(false)
    setShowNoisyBanner(false)
  }

  if (micDenied) {
    // Requirement 8.5: hide icon, default to touch mode
    return null
  }

  const iconColor =
    level === 'green' ? '#16a34a' : level === 'yellow' ? '#d97706' : '#dc2626'

  return (
    <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Persistent microphone quality icon */}
      <div
        aria-label={`Microphone quality: ${level} (${currentDb} dB)`}
        title={`Noise level: ${currentDb} dB`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
        }}
      >
        <span
          style={{
            width: '0.75rem',
            height: '0.75rem',
            borderRadius: '50%',
            background: iconColor,
            display: 'inline-block',
          }}
        />
        <span>{currentDb} dB</span>
      </div>

      {/* Noisy environment banner */}
      {showNoisyBanner && (
        <div
          role="alert"
          style={{
            padding: '0.5rem 1rem',
            background: '#fef3c7',
            border: '1px solid #d97706',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            color: '#92400e',
          }}
        >
          Noisy environment — touch mode active
        </div>
      )}

      {/* Voice re-enable prompt */}
      {showVoicePrompt && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: '#f0fdf4',
            border: '1px solid #16a34a',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span>Voice input available</span>
          <button
            onClick={handleEnableVoice}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Enable Voice
          </button>
        </div>
      )}
    </div>
  )
}
