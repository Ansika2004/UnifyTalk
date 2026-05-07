/**
 * CalmCorner — soothing audio, breathing exercises, and sleep timer.
 * SOS button and staff messages remain active (this component does NOT suppress them).
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */
import { useEffect, useRef, useState } from 'react'
import { ttsEngine } from '../services/ttsEngine'
import { computeSleepTimerMs, isSleepTimerExpired } from '../services/calmCornerLogic'

// ─── Audio tracks ─────────────────────────────────────────────────────────────

const AUDIO_TRACKS = [
  { id: 'rain', label: 'Rain', src: '/audio/rain.mp3' },
  { id: 'nature', label: 'Nature Sounds', src: '/audio/nature.mp3' },
  { id: 'music', label: 'Gentle Music', src: '/audio/music.mp3' },
] as const

type TrackId = (typeof AUDIO_TRACKS)[number]['id']

// ─── Breathing exercises ──────────────────────────────────────────────────────

type BreathingType = '4-7-8' | 'box'
type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'hold2'
type CycleDuration = 4 | 6 | 8

interface BreathingExercise {
  id: BreathingType
  label: string
  phases: BreathPhase[]
  description: string
}

const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: '4-7-8',
    label: '4-7-8 Breathing',
    phases: ['inhale', 'hold', 'exhale'],
    description: 'Inhale for 4s, hold for 7s, exhale for 8s',
  },
  {
    id: 'box',
    label: 'Box Breathing',
    phases: ['inhale', 'hold', 'exhale', 'hold2'],
    description: 'Inhale, hold, exhale, hold — equal durations',
  },
]

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
  hold2: 'Hold',
}

const SLEEP_TIMER_OPTIONS: (15 | 30 | 60)[] = [15, 30, 60]

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalmCorner() {
  // Audio state
  const [activeTrack, setActiveTrack] = useState<TrackId | null>(null)
  const [volume, setVolume] = useState(0.7)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Breathing state
  const [activeExercise, setActiveExercise] = useState<BreathingType | null>(null)
  const [cycleDuration, setCycleDuration] = useState<CycleDuration>(4)
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale')
  const [breathProgress, setBreathProgress] = useState(0) // 0–1
  const breathTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseIndexRef = useRef(0)
  const phaseElapsedRef = useRef(0)

  // Sleep timer state
  const [sleepTimer, setSleepTimer] = useState<15 | 30 | 60 | null>(null)
    const sleepCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopBreathing()
      clearSleepTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Audio ──────────────────────────────────────────────────────────────────

  function handlePlayTrack(trackId: TrackId) {
    if (activeTrack === trackId) {
      // Pause
      audioRef.current?.pause()
      setActiveTrack(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const track = AUDIO_TRACKS.find((t) => t.id === trackId)!
      const audio = new Audio(track.src)
      audio.volume = volume
      audio.loop = true
      audio.play().catch(() => {/* audio play may fail in test env */})
      audioRef.current = audio
      setActiveTrack(trackId)
    }
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    setActiveTrack(null)
  }

  // ─── Breathing ──────────────────────────────────────────────────────────────

  function startBreathing(type: BreathingType) {
    stopBreathing()
    setActiveExercise(type)
    phaseIndexRef.current = 0
    phaseElapsedRef.current = 0

    const exercise = BREATHING_EXERCISES.find((e) => e.id === type)!
    const phases = exercise.phases
    const phaseDuration = cycleDuration * 1000 // ms per phase
    const tickMs = 50

    function getPhaseLabel(idx: number): BreathPhase {
      return phases[idx % phases.length]
    }

    setBreathPhase(getPhaseLabel(0))
    ttsEngine.speak(PHASE_LABELS[getPhaseLabel(0)])

    breathTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return
      phaseElapsedRef.current += tickMs
      const progress = Math.min(phaseElapsedRef.current / phaseDuration, 1)
      setBreathProgress(progress)

      if (phaseElapsedRef.current >= phaseDuration) {
        phaseElapsedRef.current = 0
        phaseIndexRef.current = (phaseIndexRef.current + 1) % phases.length
        const nextPhase = getPhaseLabel(phaseIndexRef.current)
        setBreathPhase(nextPhase)
        ttsEngine.speak(PHASE_LABELS[nextPhase])
      }
    }, tickMs)
  }

  function stopBreathing() {
    if (breathTimerRef.current) {
      clearInterval(breathTimerRef.current)
      breathTimerRef.current = null
    }
    setActiveExercise(null)
    setBreathProgress(0)
  }

  // ─── Sleep timer ─────────────────────────────────────────────────────────────

  function startSleepTimer(minutes: 15 | 30 | 60) {
    clearSleepTimer()
    setSleepTimer(minutes)
    const startedAt = Date.now()
        const durationMs = computeSleepTimerMs(minutes)

    sleepCheckRef.current = setInterval(() => {
      if (!mountedRef.current) return
      if (isSleepTimerExpired(startedAt, durationMs, Date.now())) {
        stopAudio()
        stopBreathing()
        clearSleepTimer()
      }
    }, 1000)
  }

  function clearSleepTimer() {
    if (sleepCheckRef.current) {
      clearInterval(sleepCheckRef.current)
      sleepCheckRef.current = null
    }
    setSleepTimer(null)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      aria-label="Calm Corner"
      style={{
        padding: '1.5rem',
        maxWidth: '640px',
        margin: '0 auto',
        fontFamily: 'inherit',
        // z-index intentionally NOT set to 9999 — SOS button must remain on top (Req 15.6)
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>🌿 Calm Corner</h1>

      {/* ── Audio tracks ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Soothing Sounds</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {AUDIO_TRACKS.map((track) => (
            <div
              key={track.id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <button
                onClick={() => handlePlayTrack(track.id)}
                aria-label={activeTrack === track.id ? `Pause ${track.label}` : `Play ${track.label}`}
                aria-pressed={activeTrack === track.id}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: activeTrack === track.id ? '#1d4ed8' : '#e5e7eb',
                  color: activeTrack === track.id ? '#fff' : '#111',
                  cursor: 'pointer',
                  minWidth: '140px',
                }}
              >
                {activeTrack === track.id ? '⏸ Pause' : '▶ Play'} {track.label}
              </button>
            </div>
          ))}
        </div>

        {/* Volume control */}
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="calm-volume" style={{ fontSize: '0.875rem' }}>
            Volume
          </label>
          <input
            id="calm-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            aria-label="Audio volume"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.875rem', minWidth: '2.5rem' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </section>

      {/* ── Breathing exercises ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Breathing Exercises</h2>

        {/* Cycle duration selector */}
        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Cycle duration:</span>
          {([4, 6, 8] as CycleDuration[]).map((d) => (
            <button
              key={d}
              onClick={() => setCycleDuration(d)}
              aria-pressed={cycleDuration === d}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                background: cycleDuration === d ? '#1d4ed8' : 'transparent',
                color: cycleDuration === d ? '#fff' : '#111',
                cursor: 'pointer',
              }}
            >
              {d}s
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {BREATHING_EXERCISES.map((ex) => (
            <button
              key={ex.id}
              onClick={() =>
                activeExercise === ex.id ? stopBreathing() : startBreathing(ex.id)
              }
              aria-label={activeExercise === ex.id ? `Stop ${ex.label}` : `Start ${ex.label}`}
              aria-pressed={activeExercise === ex.id}
              title={ex.description}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: activeExercise === ex.id ? '#7c3aed' : '#e5e7eb',
                color: activeExercise === ex.id ? '#fff' : '#111',
                cursor: 'pointer',
              }}
            >
              {activeExercise === ex.id ? '⏹ Stop' : '▶ Start'} {ex.label}
            </button>
          ))}
        </div>

        {/* Breathing animation */}
        {activeExercise && (
          <div
            aria-live="polite"
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              aria-label={`Breathing phase: ${PHASE_LABELS[breathPhase]}`}
              style={{
                width: `${80 + breathProgress * 80}px`,
                height: `${80 + breathProgress * 80}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #a5f3fc, #0891b2)',
                transition: 'width 0.05s linear, height 0.05s linear',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {PHASE_LABELS[breathPhase]}
            </div>
          </div>
        )}
      </section>

      {/* ── Sleep timer ── */}
      <section>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Sleep Timer</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {SLEEP_TIMER_OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => (sleepTimer === min ? clearSleepTimer() : startSleepTimer(min))}
              aria-pressed={sleepTimer === min}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                background: sleepTimer === min ? '#1d4ed8' : 'transparent',
                color: sleepTimer === min ? '#fff' : '#111',
                cursor: 'pointer',
              }}
            >
              {min} min
            </button>
          ))}
          {sleepTimer && (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Timer active — audio will stop after {sleepTimer} minutes
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
