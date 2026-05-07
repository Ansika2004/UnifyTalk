/**
 * VoiceProfileRecorder — records voice samples, uploads to Firebase Storage,
 * writes metadata to Firestore, and handles voice model generation + preview.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
import { useEffect, useRef, useState } from 'react'
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '@firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes } from '@firebase/storage'
import { firebaseApp, firebaseConfigured, getDb } from '../firebase'
import type { VoiceSample, VoiceProfile } from '../types'

function getStorageInstance() { return getStorage(firebaseApp) }

const MIN_SAMPLES = 10
const MIN_DURATION_S = 5
const MAX_NOISE_DB = 50

interface VoiceProfileRecorderProps {
  patientId: string
}

export default function VoiceProfileRecorder({ patientId }: VoiceProfileRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [noiseDb, setNoiseDb] = useState(0)
  const [acceptedSamples, setAcceptedSamples] = useState<VoiceSample[]>([])
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<VoiceProfile['modelStatus']>('pending')
  const [previewText, setPreviewText] = useState('')
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const noiseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingStartRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to Firestore voice profile for model status updates
  useEffect(() => {
    if (!firebaseConfigured) return
    const db = getDb()
    if (!db) return
    const profileRef = doc(db, 'voice_profiles', patientId)
    unsubscribeRef.current = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as VoiceProfile
        setModelStatus(data.modelStatus)
        setAcceptedSamples(data.samples?.filter((s) => s.accepted) ?? [])
      }
    })
    return () => {
      unsubscribeRef.current?.()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      stopNoiseMonitor()
    }
  }, [patientId])

  function stopNoiseMonitor() {
    if (noiseTimerRef.current) {
      clearInterval(noiseTimerRef.current)
      noiseTimerRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  async function startRecording() {
    setRejectionReason(null)
    setError(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up Web Audio API for noise monitoring
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      noiseTimerRef.current = setInterval(() => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((s, v) => s + v, 0) / data.length
        // Convert 0–255 scale to approximate dB (0–90 dB range)
        const db = (avg / 255) * 90
        setNoiseDb(Math.round(db))
      }, 200)

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recordingStartRef.current = Date.now()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        stopNoiseMonitor()
        handleRecordingComplete()
      }

      recorder.start()
      setIsRecording(true)
    } catch {
      setError('Microphone access denied or unavailable.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  async function handleRecordingComplete() {
    const durationS = (Date.now() - recordingStartRef.current) / 1000
    const currentNoise = noiseDb

    if (durationS < MIN_DURATION_S) {
      setRejectionReason(`Sample too short (${durationS.toFixed(1)}s — need ≥${MIN_DURATION_S}s)`)
      return
    }
    if (currentNoise > MAX_NOISE_DB) {
      setRejectionReason(`Too noisy (${currentNoise} dB — max ${MAX_NOISE_DB} dB)`)
      return
    }

    // Upload to Firebase Storage
    const sampleId = `${Date.now()}`
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const path = `voice_samples/${patientId}/${sampleId}.webm`
    const fileRef = storageRef(getStorageInstance(), path)

    try {
      await uploadBytes(fileRef, blob)

      const sample: VoiceSample = {
        sampleId,
        storageUrl: path,
        durationSeconds: durationS,
        noiseLevel: currentNoise,
        recordedAt: null as any, // serverTimestamp handled in Firestore
        accepted: true,
      }

      // Write metadata to Firestore
      const db = getDb()
      if (!db) throw new Error('Firebase not configured')
      const profileRef = doc(db, 'voice_profiles', patientId)
      const updatedSamples = [...acceptedSamples, sample]
      await setDoc(
        profileRef,
        {
          patientId,
          samples: updatedSamples,
          modelStatus: 'pending',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch {
      setError('Failed to upload sample. Please try again.')
    }
  }

  async function generateVoiceModel() {
    if (!firebaseConfigured) return
    const db = getDb()
    if (!db) return
    const profileRef = doc(db, 'voice_profiles', patientId)
    await setDoc(profileRef, { modelStatus: 'processing' }, { merge: true })
    // Stub: actual external API call would be triggered here (e.g., Cloud Function)
  }

  function handlePlayPreview() {
    if (!previewText.trim()) return
    // Stub playback — in production this would use the custom model URL
    setPreviewPlaying(true)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(previewText)
      utterance.onend = () => setPreviewPlaying(false)
      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => setPreviewPlaying(false), 1500)
    }
  }

  const noiseColor = noiseDb > MAX_NOISE_DB ? '#dc2626' : noiseDb > 40 ? '#d97706' : '#16a34a'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Voice Profile Recorder</h2>

      {/* Noise indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          aria-label={`Noise level: ${noiseDb} dB`}
          style={{
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            background: noiseColor,
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '0.9rem' }}>Noise: {noiseDb} dB</span>
        {isRecording && noiseDb > MAX_NOISE_DB && (
          <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>Too noisy!</span>
        )}
      </div>

      {/* Sample count */}
      <div style={{ fontSize: '1rem' }}>
        Accepted samples: <strong>{acceptedSamples.length}</strong> / {MIN_SAMPLES} required
      </div>

      {/* Record controls */}
      {modelStatus === 'pending' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={acceptedSamples.length >= MIN_SAMPLES}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#1d4ed8',
                color: '#fff',
                cursor: acceptedSamples.length >= MIN_SAMPLES ? 'not-allowed' : 'pointer',
                opacity: acceptedSamples.length >= MIN_SAMPLES ? 0.5 : 1,
              }}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Stop Recording
            </button>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {rejectionReason && (
        <div role="alert" style={{ color: '#dc2626', fontSize: '0.9rem' }}>
          Sample rejected: {rejectionReason}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" style={{ color: '#dc2626', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Generate model button */}
      {acceptedSamples.length >= MIN_SAMPLES && modelStatus === 'pending' && (
        <button
          onClick={generateVoiceModel}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Generate Voice Model
        </button>
      )}

      {/* Processing state */}
      {modelStatus === 'processing' && (
        <div role="status" aria-live="polite" style={{ fontSize: '1rem' }}>
          Generating your voice model… please wait.
        </div>
      )}

      {/* Ready state — preview */}
      {modelStatus === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, color: '#16a34a', fontWeight: 'bold' }}>
            Voice model ready!
          </p>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Type a phrase to preview…"
            aria-label="Preview text"
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #ccc',
            }}
          />
          <button
            onClick={handlePlayPreview}
            disabled={!previewText.trim() || previewPlaying}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#7c3aed',
              color: '#fff',
              cursor: !previewText.trim() || previewPlaying ? 'not-allowed' : 'pointer',
              opacity: !previewText.trim() || previewPlaying ? 0.5 : 1,
            }}
          >
            {previewPlaying ? 'Playing…' : 'Play Preview'}
          </button>
        </div>
      )}

      {/* Failed state */}
      {modelStatus === 'failed' && (
        <div role="alert" style={{ color: '#dc2626' }}>
          <p>Voice model generation failed. Your recordings are saved — you can try again.</p>
          <button
            onClick={generateVoiceModel}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Retry Generation
          </button>
        </div>
      )}
    </div>
  )
}
