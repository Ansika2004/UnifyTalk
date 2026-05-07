import { useEffect, useRef, useState } from 'react'
import { classifyGesture } from '../services/gestureClassifier'
import { useGlobalStore, selectAudioMuted } from '../store/globalStore'
import type { HandLandmarks } from '../services/gestureClassifier'

export interface SignLanguageTranslatorProps {
  onPhraseReady?: (phrase: string) => void
  onFallbackRequested?: () => void
}

type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error'
type MediaPipeStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Generate mock landmarks (21 points) for the stub classifier */
function mockLandmarks(): HandLandmarks {
  return Array.from({ length: 21 }, (_, i) => ({
    x: (i % 5) / 5,
    y: Math.floor(i / 5) / 5,
    z: 0,
  }))
}

export default function SignLanguageTranslator({
  onPhraseReady,
  onFallbackRequested,
}: SignLanguageTranslatorProps) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [mediaPipeStatus, setMediaPipeStatus] = useState<MediaPipeStatus>('idle')
  const [phraseBuffer, setPhraseBuffer] = useState<string[]>([])
  const [recognizedWord, setRecognizedWord] = useState<string | null>(null)
  const [retryPrompt, setRetryPrompt] = useState(false)

  const audioMuted = useGlobalStore(selectAudioMuted)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaPipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const frameLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    initCamera()
    return () => {
      mountedRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (mediaPipeTimerRef.current) {
        clearTimeout(mediaPipeTimerRef.current)
      }
      if (frameLoopRef.current) {
        clearTimeout(frameLoopRef.current)
      }
    }
  }, [])

  // Start recognition loop when MediaPipe becomes ready
  useEffect(() => {
    if (mediaPipeStatus === 'ready') {
      startRecognitionLoop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPipeStatus])

  async function initCamera() {
    setCameraStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { frameRate: { ideal: 30 } },
      })
      streamRef.current = stream
      setCameraStatus('active')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Simulate MediaPipe WASM loading
      setMediaPipeStatus('loading')
      mediaPipeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setMediaPipeStatus('ready')
        }
      }, 500)
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')

      if (isDenied) {
        setCameraStatus('denied')
      } else {
        setCameraStatus('error')
      }
    }
  }

  function startRecognitionLoop() {
    async function processFrame() {
      if (!mountedRef.current) return

      try {
        const landmarks = mockLandmarks()
        const result = await classifyGesture(landmarks)

        if (!mountedRef.current) return

        if (result.confidence >= 0.75) {
          setRecognizedWord(result.sign)
          setRetryPrompt(false)
          setPhraseBuffer((prev) => [...prev, result.sign])

          // TTS: speak the recognized word unless muted
          if (!audioMuted && typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(result.sign)
            window.speechSynthesis.speak(utterance)
          }
        } else {
          setRetryPrompt(true)
          setRecognizedWord(null)
        }
      } catch {
        // Silently ignore classification errors in the loop
      }

      if (mountedRef.current) {
        // ~15 fps
        frameLoopRef.current = setTimeout(processFrame, 66)
      }
    }

    processFrame()
  }

  function handleSend() {
    if (phraseBuffer.length === 0) return
    const phrase = phraseBuffer.join(' ')
    onPhraseReady?.(phrase)
    setPhraseBuffer([])
    setRecognizedWord(null)
  }

  function handleClear() {
    setPhraseBuffer([])
    setRecognizedWord(null)
    setRetryPrompt(false)
  }

  // Rendering states
  if (cameraStatus === 'idle' || cameraStatus === 'requesting') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: '1.5rem', textAlign: 'center', fontSize: '1.25rem' }}
      >
        Starting camera…
      </div>
    )
  }

  if (cameraStatus === 'denied') {
    return (
      <div
        role="alert"
        style={{ padding: '1.5rem', textAlign: 'center', fontSize: '1.25rem' }}
      >
        <p>Camera access is required for sign language.</p>
        <button
          onClick={onFallbackRequested}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '0.5rem',
            border: '2px solid currentColor',
            background: 'transparent',
          }}
        >
          Use Pictogram Board instead
        </button>
      </div>
    )
  }

  if (cameraStatus === 'error') {
    return (
      <div
        role="alert"
        style={{ padding: '1.5rem', textAlign: 'center', fontSize: '1.25rem', color: 'red' }}
      >
        Camera error. Please check your device and try again.
      </div>
    )
  }

  // cameraStatus === 'active'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {/* Video feed */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        aria-label="Camera feed for sign language recognition"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '0.5rem',
          background: '#000',
          display: 'block',
        }}
      />

      {/* MediaPipe loading state */}
      {mediaPipeStatus === 'loading' && (
        <div role="status" aria-live="polite" style={{ fontSize: '1rem' }}>
          Loading gesture recognition…
        </div>
      )}

      {mediaPipeStatus === 'error' && (
        <div role="alert" style={{ fontSize: '1rem', color: 'red' }}>
          Gesture recognition failed to load.
        </div>
      )}

      {/* Active recognition UI */}
      {mediaPipeStatus === 'ready' && (
        <>
          {/* Recognized word display */}
          {recognizedWord && (
            <div
              aria-live="polite"
              style={{ fontSize: '1.25rem', fontWeight: 'bold', minHeight: '2rem' }}
            >
              Recognized: {recognizedWord}
            </div>
          )}

          {/* Retry prompt */}
          {retryPrompt && (
            <div role="alert" aria-live="assertive" style={{ fontSize: '1rem', color: '#b45309' }}>
              Not recognized — please try again
            </div>
          )}

          {/* Phrase buffer */}
          <div
            aria-label="Accumulated phrase"
            aria-live="polite"
            style={{
              minHeight: '3rem',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '0.5rem',
              fontSize: '1.25rem',
            }}
          >
            {phraseBuffer.length > 0 ? phraseBuffer.join(' ') : <em>No phrase yet</em>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleSend}
              disabled={phraseBuffer.length === 0}
              aria-label="Send accumulated phrase"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: phraseBuffer.length === 0 ? 'not-allowed' : 'pointer',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#1d4ed8',
                color: '#fff',
                opacity: phraseBuffer.length === 0 ? 0.5 : 1,
              }}
            >
              Send
            </button>
            <button
              onClick={handleClear}
              aria-label="Clear phrase buffer"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '0.5rem',
                border: '2px solid #6b7280',
                background: 'transparent',
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export type { CameraStatus, MediaPipeStatus }
