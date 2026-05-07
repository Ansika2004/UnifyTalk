/**
 * Eye_Gaze_Controller — MediaPipe Face Mesh-based blink/gaze navigation.
 * Stubs Face Mesh WASM loading (simulated with setTimeout like SignLanguageTranslator).
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useGlobalStore, selectSetActiveInputMode } from '../store/globalStore'
import { detectDoubleBlink, detectSustainedGaze } from '../services/eyeGazeLogic'

type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error'
type FaceMeshStatus = 'idle' | 'loading' | 'ready' | 'error'
type GazeDirection = 'left' | 'right' | 'center' | null

const DOUBLE_BLINK_WINDOW_MS = 600
const SUSTAINED_GAZE_THRESHOLD_MS = 1000
const FRAME_INTERVAL_MS = 66 // ~15 fps

export interface EyeGazeControllerProps {
  /** Called when calibration is complete */
  onCalibrated?: () => void
  /** Whether to show the recalibration button (e.g. from settings) */
  showRecalibrate?: boolean
}

export default function EyeGazeController({
  onCalibrated,
  showRecalibrate = false,
}: EyeGazeControllerProps) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [faceMeshStatus, setFaceMeshStatus] = useState<FaceMeshStatus>('idle')
  const [showCalibration, setShowCalibration] = useState(false)
  const [calibrated, setCalibrated] = useState(false)
  const [gazeDirection, setGazeDirection] = useState<GazeDirection>(null)

  const setActiveInputMode = useGlobalStore(selectSetActiveInputMode)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceMeshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frameLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Gaze tracking state (mutable refs to avoid stale closures in loop)
  const blinkHistoryRef = useRef<number[]>([])
  const gazeDirectionRef = useRef<GazeDirection>(null)
  const gazeStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    mountedRef.current = true
    initCamera()
    return () => {
      mountedRef.current = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (faceMeshTimerRef.current) clearTimeout(faceMeshTimerRef.current)
      if (frameLoopRef.current) clearTimeout(frameLoopRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show calibration on first use (when Face Mesh is ready and not yet calibrated)
  useEffect(() => {
    if (faceMeshStatus === 'ready' && !calibrated) {
      setShowCalibration(true)
    }
  }, [faceMeshStatus, calibrated])

  // Start recognition loop when Face Mesh is ready and calibrated
  useEffect(() => {
    if (faceMeshStatus === 'ready' && calibrated) {
      startGazeLoop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceMeshStatus, calibrated])

  async function initCamera() {
    setCameraStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', frameRate: { ideal: 30 } },
      })
      streamRef.current = stream
      setCameraStatus('active')
      if (videoRef.current) videoRef.current.srcObject = stream

      // Stub: simulate Face Mesh WASM loading
      setFaceMeshStatus('loading')
      faceMeshTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setFaceMeshStatus('ready')
      }, 500)
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setCameraStatus(isDenied ? 'denied' : 'error')
      setFaceMeshStatus('error')
      // Fall back to touch input
      setActiveInputMode('touch')
    }
  }

  /** Simulate gaze direction from Face Mesh landmarks (stub) */
  function simulateGazeFrame(): { blinked: boolean; direction: GazeDirection } {
    // Stub: cycle through directions deterministically for demo
    const t = Date.now()
    const cycle = Math.floor(t / 2000) % 4
    const directions: GazeDirection[] = ['center', 'left', 'center', 'right']
    const direction = directions[cycle]
    // Simulate occasional blink (~every 3s)
    const blinked = t % 3000 < 100
    return { blinked, direction }
  }

  function startGazeLoop() {
    function processFrame() {
      if (!mountedRef.current) return

      const { blinked, direction } = simulateGazeFrame()

      // Track blinks
      if (blinked) {
        const now = Date.now()
        blinkHistoryRef.current = [
          ...blinkHistoryRef.current.filter((t) => now - t <= DOUBLE_BLINK_WINDOW_MS),
          now,
        ]

        if (detectDoubleBlink(blinkHistoryRef.current, DOUBLE_BLINK_WINDOW_MS)) {
          blinkHistoryRef.current = []
          dispatchSelectOnFocused()
        }
      }

      // Track gaze direction
      if (direction !== gazeDirectionRef.current) {
        gazeDirectionRef.current = direction
        gazeStartTimeRef.current = Date.now()
        setGazeDirection(direction)
      } else if (direction !== null && gazeStartTimeRef.current !== null) {
        if (detectSustainedGaze(direction, gazeStartTimeRef.current, SUSTAINED_GAZE_THRESHOLD_MS)) {
          if (direction === 'left') {
            gazeStartTimeRef.current = Date.now() // reset to avoid repeated triggers
            window.history.back()
          } else if (direction === 'right') {
            gazeStartTimeRef.current = Date.now()
            window.history.forward()
          }
        }
      }

      if (mountedRef.current) {
        frameLoopRef.current = setTimeout(processFrame, FRAME_INTERVAL_MS)
      }
    }

    processFrame()
  }

  function dispatchSelectOnFocused() {
    const focused = document.activeElement
    if (focused && focused !== document.body) {
      focused.dispatchEvent(new CustomEvent('eyegaze:select', { bubbles: true }))
    }
  }

  const handleCalibrationComplete = useCallback(() => {
    setShowCalibration(false)
    setCalibrated(true)
    onCalibrated?.()
  }, [onCalibrated])

  const handleRecalibrate = useCallback(() => {
    if (frameLoopRef.current) clearTimeout(frameLoopRef.current)
    setCalibrated(false)
    setShowCalibration(true)
  }, [])

  // Error / unavailable states
  if (cameraStatus === 'denied' || cameraStatus === 'error' || faceMeshStatus === 'error') {
    return (
      <div
        role="alert"
        style={{ padding: '1.5rem', textAlign: 'center', fontSize: '1.25rem', color: '#b91c1c' }}
      >
        <p>
          {cameraStatus === 'denied'
            ? 'Camera access denied. Eye gaze control is unavailable.'
            : 'Camera or Face Mesh initialization failed. Eye gaze control is unavailable.'}
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '1rem', color: '#374151' }}>
          Touch input mode is active.
        </p>
      </div>
    )
  }

  if (cameraStatus === 'idle' || cameraStatus === 'requesting') {
    return (
      <div role="status" aria-live="polite" style={{ padding: '1.5rem', textAlign: 'center' }}>
        Starting front camera…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden video feed for Face Mesh processing */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        aria-hidden="true"
        style={{ width: 1, height: 1, position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />

      {/* Face Mesh loading */}
      {faceMeshStatus === 'loading' && (
        <div role="status" aria-live="polite" style={{ padding: '1rem', fontSize: '1rem' }}>
          Loading eye gaze recognition…
        </div>
      )}

      {/* Calibration modal */}
      {showCalibration && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Eye gaze calibration"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 8000,
            color: '#fff',
            fontSize: '1.5rem',
            gap: '2rem',
          }}
        >
          <p>Look at the center dot</p>
          {/* Center calibration dot */}
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#ffff00',
              boxShadow: '0 0 0 4px #fff',
            }}
          />
          <button
            onClick={handleCalibrationComplete}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              fontSize: '1.125rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#1d4ed8',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Done — Start Eye Gaze Control
          </button>
        </div>
      )}

      {/* Active gaze indicator */}
      {faceMeshStatus === 'ready' && calibrated && (
        <div
          aria-live="polite"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
            }}
          />
          Eye gaze active
          {gazeDirection && gazeDirection !== 'center' && (
            <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
              Gaze: {gazeDirection}
            </span>
          )}
          {showRecalibrate && (
            <button
              onClick={handleRecalibrate}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                borderRadius: '0.375rem',
                border: '1px solid #6b7280',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Recalibrate
            </button>
          )}
        </div>
      )}

      {/* Global focus ring style injected once */}
      <style>{`
        [data-eyegaze-focused] {
          outline: 3px solid #ffff00 !important;
          outline-offset: 2px !important;
        }
      `}</style>
    </div>
  )
}
