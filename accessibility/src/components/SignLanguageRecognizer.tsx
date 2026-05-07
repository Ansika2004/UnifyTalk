import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { classifyGesture } from '@/services/gestureClassifier'
import { appendGestureSession } from '@/services/gestureDataService'
import { GestureDataSummary } from '@/components/GestureDataSummary'
import type { SignLanguage, GestureRecognitionResult } from '@/types'

// ─── MediaPipe CDN types ──────────────────────────────────────────────────────

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface HandsResults {
  multiHandLandmarks?: HandLandmark[][]
}

interface HandsOptions {
  maxNumHands: number
  modelComplexity: number
  minDetectionConfidence: number
  minTrackingConfidence: number
}

interface MediaPipeHands {
  setOptions(options: HandsOptions): void
  onResults(callback: (results: HandsResults) => void): void
  send(inputs: { image: HTMLVideoElement }): Promise<void>
  close(): void
}

declare global {
  interface Window {
    Hands?: new (config: { locateFile: (file: string) => string }) => MediaPipeHands
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7
const GESTURE_DATA_KEY = 'gesture_data_cache'
const GESTURE_CONSENT_KEY = 'gestureDataConsent'
const CONSENT_VERSION = '1.0'
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGestureConsent(): boolean {
  try {
    return localStorage.getItem(GESTURE_CONSENT_KEY) === 'true'
  } catch {
    return false
  }
}

function setGestureConsent(value: boolean): void {
  try {
    localStorage.setItem(GESTURE_CONSENT_KEY, String(value))
  } catch { /* ignore */ }
}

/**
 * Cache gesture result in localStorage only when consent is given.
 * 3.2.1 — consent gate enforced here for local cache.
 */
function cacheGestureData(result: GestureRecognitionResult, consent: boolean): void {
  if (!consent) return
  try {
    const existing = JSON.parse(localStorage.getItem(GESTURE_DATA_KEY) ?? '[]') as GestureRecognitionResult[]
    existing.push(result)
    localStorage.setItem(GESTURE_DATA_KEY, JSON.stringify(existing))
  } catch { /* ignore */ }
}

/** Generate a simple session ID based on timestamp + random suffix. */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Inject the MediaPipe Hands CDN script and resolve when window.Hands is ready. */
function loadMediaPipeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.Hands) {
      resolve()
      return
    }

    const existing = document.getElementById('mediapipe-hands-script')
    if (existing) {
      // Script tag exists but Hands not yet available — wait for load
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('MediaPipe Hands script failed to load')))
      return
    }

    const script = document.createElement('script')
    script.id = 'mediapipe-hands-script'
    script.src = `${MEDIAPIPE_CDN}/hands.js`
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (window.Hands) {
        resolve()
      } else {
        reject(new Error('MediaPipe Hands not available after script load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load MediaPipe Hands from CDN'))
    document.head.appendChild(script)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SignLanguageRecognizerProps {
  onResult?: (result: GestureRecognitionResult) => void
  /** Optional authenticated user ID for Firestore gesture data persistence */
  userId?: string | null
}

export function SignLanguageRecognizer({ onResult, userId = null }: SignLanguageRecognizerProps) {
  const { preferences } = useAccessibility()
  const [language, setLanguage] = useState<SignLanguage>('ISL')
  const [wasmLoading, setWasmLoading] = useState(false)
  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [result, setResult] = useState<GestureRecognitionResult | null>(null)
  const [consent, setConsent] = useState(getGestureConsent)

  // Accumulate results for the current camera session to batch-write to Firestore
  const sessionResultsRef = useRef<GestureRecognitionResult[]>([])
  const sessionIdRef = useRef<string>(generateSessionId())

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const handsRef = useRef<MediaPipeHands | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  // Keep a ref to the current language so the MediaPipe callback always reads
  // the latest value without needing to re-register the handler on every change.
  const languageRef = useRef<SignLanguage>(language)
  // Keep a ref to consent so the MediaPipe callback always reads the latest value.
  const consentRef = useRef<boolean>(consent)
  // Keep a ref to userId for use inside async callbacks
  const userIdRef = useRef<string | null>(userId)

  // Keep languageRef in sync whenever the user changes the language selector
  useEffect(() => {
    languageRef.current = language
  }, [language])

  // Keep consentRef and userIdRef in sync
  useEffect(() => { consentRef.current = consent }, [consent])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // ── Load MediaPipe Hands WASM on mount ──────────────────────────────────────
  useEffect(() => {
    setWasmLoading(true)
    setWasmError(null)

    loadMediaPipeScript()
      .then(() => {
        if (!window.Hands) throw new Error('window.Hands unavailable')

        const hands = new window.Hands({
          locateFile: (file: string) => `${MEDIAPIPE_CDN}/${file}`,
        })

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        })

        hands.onResults((results: HandsResults) => {
          const landmarks = results.multiHandLandmarks?.[0]
          if (!landmarks || landmarks.length === 0) return

          const flat = landmarks.map((lm) => [lm.x, lm.y, lm.z])
          const classified = classifyGesture(flat, languageRef.current)

          const recognition: GestureRecognitionResult = {
            text: classified.sign,
            confidence: classified.confidence,
            language: languageRef.current,
            timestamp: Date.now(),
          }

          setResult(recognition)
          // 3.2.1 — consent gate: only cache/collect when consent is true
          cacheGestureData(recognition, consentRef.current)
          if (consentRef.current) {
            sessionResultsRef.current.push(recognition)
          }
          onResult?.(recognition)
        })

        handsRef.current = hands
        setWasmReady(true)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load gesture model'
        setWasmError(msg)
      })
      .finally(() => setWasmLoading(false))

    return () => {
      handsRef.current?.close()
      handsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera loop ─────────────────────────────────────────────────────────────
  const runLoop = useCallback(async () => {
    const video = videoRef.current
    const hands = handsRef.current
    if (!activeRef.current || !video || !hands) return

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        await hands.send({ image: video })
      } catch {
        // Non-fatal: skip frame on error
      }
    }

    rafRef.current = requestAnimationFrame(runLoop)
  }, [])

  const stopCamera = useCallback(() => {
    activeRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)

    // 3.2.2 — flush accumulated session results to Firestore on session end
    const results = sessionResultsRef.current
    const uid = userIdRef.current
    if (results.length > 0 && uid && consentRef.current) {
      const sid = sessionIdRef.current
      appendGestureSession(uid, sid, results, CONSENT_VERSION, true).catch(() => {
        // Silently fail — data is already cached in localStorage
      })
    }
    // Reset for next session
    sessionResultsRef.current = []
    sessionIdRef.current = generateSessionId()
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }

      activeRef.current = true
      setCameraActive(true)
      rafRef.current = requestAnimationFrame(runLoop)
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setCameraError(
        isDenied
          ? 'Camera permission denied. Please allow camera access to use sign language recognition.'
          : 'Could not access camera. Please check your device and try again.',
      )
      setCameraActive(false)
    }
  }, [runLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  function handleConsentToggle() {
    const next = !consent
    setConsent(next)
    setGestureConsent(next)
    // 3.2.1 — if consent is revoked, discard any buffered session data
    if (!next) {
      sessionResultsRef.current = []
      sessionIdRef.current = generateSessionId()
    }
  }

  const lowConfidence = result !== null && result.confidence < CONFIDENCE_THRESHOLD

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">Sign Language Recognizer</h2>

      {/* Language selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="sign-language-select" className="font-medium text-sm">Language:</label>
        <select
          id="sign-language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SignLanguage)}
          className="rounded border px-2 py-1 text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', borderRadius: '0.375rem' }}
          aria-label="Select sign language"
        >
          <option value="ASL">ASL — American Sign Language</option>
          <option value="BSL">BSL — British Sign Language</option>
          <option value="ISL">ISL — Indian Sign Language</option>
        </select>
      </div>

      {/* WASM loading */}
      {wasmLoading && (
        <p role="status" aria-live="polite" className="text-sm text-gray-500">
          Loading gesture recognition model…
        </p>
      )}

      {/* WASM error */}
      {wasmError && (
        <div role="alert" className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 text-yellow-800 text-sm">
          <p>Gesture model unavailable: {wasmError}</p>
          <p className="mt-1 text-xs">Sign language recognition requires an internet connection to load the model.</p>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-300 p-3 text-red-800 text-sm">
          <p>{cameraError}</p>
          <button
            onClick={startCamera}
            className="mt-2 rounded bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700"
            aria-label="Retry camera access"
          >
            Retry camera access
          </button>
        </div>
      )}

      {/* Camera preview */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
        <video
          ref={videoRef}
          aria-label="Camera feed for sign language recognition"
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Hidden canvas used for future landmark overlay */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            Camera inactive
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            disabled={!wasmReady || wasmLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            aria-label="Start sign language recognition"
          >
            {wasmLoading ? 'Loading model…' : 'Start Recognition'}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white font-medium hover:bg-gray-700"
            aria-label="Stop sign language recognition"
          >
            Stop
          </button>
        )}
      </div>

      {/* Recognition result */}
      {result && !lowConfidence && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Recognition result"
          className="rounded-lg border border-green-300 bg-green-50 p-4"
        >
          <p className="text-2xl font-bold text-green-900 leading-tight">{result.text}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-gray-700">Confidence:</span>
            <div
              className="h-3 rounded-full bg-gray-200 flex-1 max-w-[160px]"
              role="progressbar"
              aria-valuenow={Math.round(result.confidence * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence ${Math.round(result.confidence * 100)}%`}
            >
              <div
                className="h-3 rounded-full bg-green-500"
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-800">{Math.round(result.confidence * 100)}%</span>
          </div>
        </div>
      )}

      {/* Low confidence prompt */}
      {lowConfidence && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-900"
        >
          Gesture not recognized clearly — please try again
        </div>
      )}

      {/* Consent gate for gesture data collection */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <h3 className="font-semibold text-sm mb-1">Gesture Data Collection</h3>
        <p className="text-xs text-gray-600 mb-2">
          Help improve sign language recognition by sharing your gesture data. Your data is anonymized and used only for model training.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={handleConsentToggle}
            aria-label="Consent to gesture data collection"
            className="w-4 h-4"
          />
          <span className="text-sm">I consent to gesture data collection</span>
        </label>
        {preferences.ttsEnabled && (
          <p className="text-xs text-gray-500 mt-1">
            TTS is enabled — recognized signs will be spoken aloud.
          </p>
        )}
      </div>

      {/* 3.2.4 — Gesture data summary + deletion (shown only when consent was given) */}
      {consent && (
        <GestureDataSummary
          userId={userId}
          onDeleted={() => {
            // Revoke consent after deletion so no further data is collected
            setConsent(false)
            setGestureConsent(false)
          }}
        />
      )}
    </div>
  )
}

export default SignLanguageRecognizer
