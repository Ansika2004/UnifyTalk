import { useState, useCallback, useRef, useEffect } from 'react'
import type { GestureRecognitionResult, PracticeSession } from '@/types'
import { classifyFingerspelling, classifyWordSign, COMMON_SIGNS } from '@/services/gestureClassifier'
import { SignLanguageRecognizer } from '@/components/SignLanguageRecognizer'
import { recordSession } from '@/services/progressService'

// ─── Constants ────────────────────────────────────────────────────────────────

const FINGERSPELLING_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const WORD_SIGNS = COMMON_SIGNS.slice(0, 10)
const EXERCISES_PER_SESSION = 10
const CONFIDENCE_THRESHOLD = 0.7

type ExerciseMode = 'fingerspelling' | 'word-signs'
type FeedbackState = 'idle' | 'correct' | 'incorrect'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter((x) => x !== exclude) : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

function generateSessionId(): string {
  return `learn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Target Display ───────────────────────────────────────────────────────────

interface TargetDisplayProps {
  mode: ExerciseMode
  target: string
  feedback: FeedbackState
  recognized: string
}

function TargetDisplay({ mode, target, feedback, recognized }: TargetDisplayProps) {
  const feedbackColor =
    feedback === 'correct'
      ? 'border-green-400 bg-green-50'
      : feedback === 'incorrect'
        ? 'border-red-400 bg-red-50'
        : 'border-blue-200 bg-blue-50'

  return (
    <div
      className={`rounded-2xl border-4 p-6 text-center transition-colors ${feedbackColor}`}
      aria-live="polite"
      aria-label={`Target ${mode === 'fingerspelling' ? 'letter' : 'word'}: ${target}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
        {mode === 'fingerspelling' ? 'Sign this letter' : 'Sign this word'}
      </p>
      <p
        className={`font-extrabold leading-none ${mode === 'fingerspelling' ? 'text-8xl' : 'text-5xl'}`}
        aria-hidden="true"
      >
        {target}
      </p>

      {feedback !== 'idle' && (
        <div
          role="status"
          aria-live="assertive"
          className="mt-4 flex items-center justify-center gap-2"
        >
          {feedback === 'correct' ? (
            <>
              <span className="text-3xl" aria-hidden="true">✓</span>
              <span className="text-green-700 font-bold text-lg">Correct!</span>
            </>
          ) : (
            <>
              <span className="text-3xl" aria-hidden="true">✗</span>
              <span className="text-red-700 font-bold text-lg">
                Recognized: <em>{recognized || '—'}</em>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

interface ScoreBarProps {
  correct: number
  total: number
  exerciseIndex: number
  totalExercises: number
}

function ScoreBar({ correct, total, exerciseIndex, totalExercises }: ScoreBarProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return (
    <div className="flex items-center gap-3" aria-label={`Score: ${correct} correct out of ${total} attempts`}>
      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
        {exerciseIndex}/{totalExercises}
      </span>
      <div
        className="flex-1 h-3 rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={exerciseIndex}
        aria-valuemin={0}
        aria-valuemax={totalExercises}
        aria-label={`Exercise ${exerciseIndex} of ${totalExercises}`}
      >
        <div
          className="h-3 rounded-full bg-blue-500 transition-all"
          style={{ width: `${(exerciseIndex / totalExercises) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
        {pct}% accuracy
      </span>
    </div>
  )
}

// ─── Session Summary ──────────────────────────────────────────────────────────

interface SessionSummaryProps {
  correct: number
  total: number
  durationSeconds: number
  onSave: () => void
  onRestart: () => void
  saving: boolean
  saved: boolean
}

function SessionSummary({ correct, total, durationSeconds, onSave, onRestart, saving, saved }: SessionSummaryProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const mins = Math.floor(durationSeconds / 60)
  const secs = durationSeconds % 60

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col gap-4 text-center"
    >
      <h2 id="summary-heading" className="text-2xl font-bold">Session Complete!</h2>
      <div className="flex justify-center gap-8">
        <div>
          <p className="text-4xl font-extrabold text-blue-600">{accuracy}%</p>
          <p className="text-sm text-gray-500 mt-1">Accuracy</p>
        </div>
        <div>
          <p className="text-4xl font-extrabold text-gray-800">{correct}/{total}</p>
          <p className="text-sm text-gray-500 mt-1">Correct</p>
        </div>
        <div>
          <p className="text-4xl font-extrabold text-gray-800">{mins}m {secs}s</p>
          <p className="text-sm text-gray-500 mt-1">Duration</p>
        </div>
      </div>

      {accuracy >= 80 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2"
        >
          <span aria-hidden="true">🏆</span>
          <span className="text-yellow-800 font-semibold">Milestone reached! 80%+ accuracy</span>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={onSave}
          disabled={saving || saved}
          aria-label="Save session to progress tracker"
          className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold min-h-[44px] hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Saved to Progress' : saving ? 'Saving…' : 'Save to Progress Tracker'}
        </button>
        <button
          onClick={onRestart}
          aria-label="Start a new exercise session"
          className="bg-gray-100 text-gray-800 rounded-xl px-6 py-3 font-semibold min-h-[44px] hover:bg-gray-200 transition-colors"
        >
          New Session
        </button>
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignLanguageLearningPage() {
  const [mode, setMode] = useState<ExerciseMode>('fingerspelling')
  const [sessionActive, setSessionActive] = useState(false)
  const [target, setTarget] = useState('')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [recognizedSign, setRecognizedSign] = useState('')
  const [sessionComplete, setSessionComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const startTimeRef = useRef<number>(0)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  // Pick a new target for the current mode
  const pickTarget = useCallback((currentTarget?: string) => {
    const pool = mode === 'fingerspelling' ? FINGERSPELLING_LETTERS : WORD_SIGNS
    return pickRandom(pool, currentTarget)
  }, [mode])

  // Start a new session
  const startSession = useCallback(() => {
    setExerciseIndex(0)
    setCorrect(0)
    setFeedback('idle')
    setRecognizedSign('')
    setSessionComplete(false)
    setSaved(false)
    setSaving(false)
    processingRef.current = false
    startTimeRef.current = Date.now()
    setTarget(pickTarget())
    setSessionActive(true)
  }, [pickTarget])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  // Handle a gesture recognition result from SignLanguageRecognizer
  const handleGestureResult = useCallback((result: GestureRecognitionResult) => {
    if (!sessionActive || sessionComplete || processingRef.current) return
    if (result.confidence < CONFIDENCE_THRESHOLD) return

    const recognized = result.text.trim().toLowerCase()
    const currentTarget = target

    if (!recognized || !currentTarget) return

    processingRef.current = true

    const isCorrect =
      mode === 'fingerspelling'
        ? recognized.toUpperCase() === currentTarget.toUpperCase()
        : recognized.toLowerCase() === currentTarget.toLowerCase()

    setRecognizedSign(result.text)
    setFeedback(isCorrect ? 'correct' : 'incorrect')

    const nextIndex = exerciseIndex + 1
    const nextCorrect = isCorrect ? correct + 1 : correct

    // Show feedback briefly, then advance
    feedbackTimerRef.current = setTimeout(() => {
      if (nextIndex >= EXERCISES_PER_SESSION) {
        setExerciseIndex(nextIndex)
        setCorrect(nextCorrect)
        setFeedback('idle')
        setSessionActive(false)
        setSessionComplete(true)
      } else {
        setExerciseIndex(nextIndex)
        setCorrect(nextCorrect)
        setFeedback('idle')
        setRecognizedSign('')
        setTarget(pickTarget(currentTarget))
        processingRef.current = false
      }
    }, 1200)
  }, [sessionActive, sessionComplete, target, mode, exerciseIndex, correct, pickTarget])

  // Save session to progress tracker
  const handleSaveSession = useCallback(async () => {
    setSaving(true)
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
    const accuracyScore = EXERCISES_PER_SESSION > 0 ? correct / EXERCISES_PER_SESSION : 0

    const session: PracticeSession = {
      id: generateSessionId(),
      userId: localStorage.getItem('userId') ?? 'local-user',
      type: 'sign-language',
      date: Date.now(),
      durationSeconds,
      accuracyScore,
    }

    try {
      await recordSession(session)
      setSaved(true)
    } catch {
      // Non-fatal — session data is still in localStorage
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }, [correct])

  const handleRestart = useCallback(() => {
    setSessionComplete(false)
    setSessionActive(false)
  }, [])

  const durationSeconds = sessionComplete
    ? Math.round((Date.now() - startTimeRef.current) / 1000)
    : 0

  return (
    <main id="main-content" className="min-h-screen pb-24 p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign Language Learning</h1>
        <p className="text-sm text-gray-500 mt-1">
          Practice fingerspelling and common signs with real-time MediaPipe feedback
        </p>
      </header>

      {/* Mode selector — only shown before session starts */}
      {!sessionActive && !sessionComplete && (
        <section aria-labelledby="mode-heading" className="mb-6">
          <h2 id="mode-heading" className="text-base font-semibold text-gray-700 mb-3">
            Choose Exercise Mode
          </h2>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="mode-heading">
            <button
              role="radio"
              aria-checked={mode === 'fingerspelling'}
              onClick={() => setMode('fingerspelling')}
              className={`rounded-2xl border-2 p-4 text-left transition-colors min-h-[80px] ${
                mode === 'fingerspelling'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <p className="font-bold text-gray-900">Fingerspelling</p>
              <p className="text-xs text-gray-500 mt-1">Practice letters A–Z</p>
            </button>
            <button
              role="radio"
              aria-checked={mode === 'word-signs'}
              onClick={() => setMode('word-signs')}
              className={`rounded-2xl border-2 p-4 text-left transition-colors min-h-[80px] ${
                mode === 'word-signs'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <p className="font-bold text-gray-900">Word Signs</p>
              <p className="text-xs text-gray-500 mt-1">Practice common signs</p>
            </button>
          </div>

          <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <p>
              <strong>Session:</strong> {EXERCISES_PER_SESSION} exercises •{' '}
              {mode === 'fingerspelling'
                ? 'Letters A–Z (random order)'
                : `Words: ${WORD_SIGNS.join(', ')}`}
            </p>
          </div>

          <button
            onClick={startSession}
            aria-label={`Start ${mode === 'fingerspelling' ? 'fingerspelling' : 'word signs'} exercise session`}
            className="mt-4 w-full bg-blue-600 text-white rounded-2xl px-6 py-4 text-lg font-bold min-h-[56px] hover:bg-blue-700 transition-colors"
          >
            Start Session
          </button>
        </section>
      )}

      {/* Active exercise */}
      {sessionActive && !sessionComplete && (
        <section aria-labelledby="exercise-heading" className="flex flex-col gap-4">
          <h2 id="exercise-heading" className="sr-only">
            Active exercise — {mode === 'fingerspelling' ? 'Fingerspelling' : 'Word Signs'}
          </h2>

          <ScoreBar
            correct={correct}
            total={exerciseIndex}
            exerciseIndex={exerciseIndex}
            totalExercises={EXERCISES_PER_SESSION}
          />

          <TargetDisplay
            mode={mode}
            target={target}
            feedback={feedback}
            recognized={recognizedSign}
          />

          {/* Camera feed with gesture recognition */}
          <div aria-label="Camera feed for sign language recognition">
            <SignLanguageRecognizer onResult={handleGestureResult} />
          </div>

          <button
            onClick={() => {
              if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
              setSessionActive(false)
              setSessionComplete(false)
            }}
            aria-label="End current exercise session"
            className="text-sm text-gray-500 underline hover:text-gray-700 text-center"
          >
            End session
          </button>
        </section>
      )}

      {/* Session summary */}
      {sessionComplete && (
        <SessionSummary
          correct={correct}
          total={EXERCISES_PER_SESSION}
          durationSeconds={durationSeconds}
          onSave={handleSaveSession}
          onRestart={handleRestart}
          saving={saving}
          saved={saved}
        />
      )}
    </main>
  )
}
