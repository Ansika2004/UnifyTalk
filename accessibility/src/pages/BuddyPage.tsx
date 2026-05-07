/**
 * BuddyPage — Buddy System UI
 * Tasks: 6.6.1–6.6.5
 * Requirements: 17.1–17.4
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { DisabilityType } from '@/types'
import {
  requestBuddyMatch,
  cancelMatch,
  submitRating,
  type BuddyMatch,
  type MatchStatus,
} from '@/services/buddyService'

const DISABILITY_OPTIONS: { value: DisabilityType; label: string }[] = [
  { value: 'deaf', label: 'Deaf' },
  { value: 'hard-of-hearing', label: 'Hard of Hearing' },
  { value: 'mute', label: 'Mute' },
  { value: 'non-verbal', label: 'Non-verbal' },
  { value: 'blind', label: 'Blind' },
  { value: 'low-vision', label: 'Low Vision' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
]

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes (Req 17.1)

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div role="group" aria-label="Rate this session from 1 to 5 stars" className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={value === star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`text-3xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
            (hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function useCountdown(totalMs: number, active: boolean) {
  const [remaining, setRemaining] = useState(totalMs)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setRemaining(totalMs)
      return
    }
    setRemaining(totalMs)
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1000) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active, totalMs])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return { remaining, minutes, seconds }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BuddyPage() {
  const [selectedDisabilities, setSelectedDisabilities] = useState<DisabilityType[]>([])
  const [language, setLanguage] = useState('en')
  const [status, setStatus] = useState<MatchStatus>('idle')
  const [match, setMatch] = useState<BuddyMatch | null>(null)
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { remaining, minutes, seconds } = useCountdown(TIMEOUT_MS, status === 'searching')

  // Trigger timeout when countdown hits 0 (Req 17.4)
  useEffect(() => {
    if (status === 'searching' && remaining === 0) {
      setStatus('timeout')
      if (currentRequestId) cancelMatch(currentRequestId)
    }
  }, [remaining, status, currentRequestId])

  const toggleDisability = (type: DisabilityType) => {
    setSelectedDisabilities((prev) =>
      prev.includes(type) ? prev.filter((d) => d !== type) : [...prev, type],
    )
  }

  const handleFindBuddy = useCallback(async () => {
    setErrorMsg(null)
    setStatus('searching')
    setMatch(null)
    setRating(0)
    setRatingSubmitted(false)

    try {
      const result = await requestBuddyMatch('local-user', selectedDisabilities, language)
      if (result) {
        setMatch(result)
        setSessionId(result.sessionId)
        setCurrentRequestId(result.requestId)
        setStatus('matched')
      } else {
        // No volunteer found — let the countdown handle timeout
        // If we get here before timeout, treat as timeout
        if (status === 'searching') setStatus('timeout')
      }
    } catch {
      setErrorMsg('Something went wrong while searching. Please try again.')
      setStatus('idle')
    }
  }, [selectedDisabilities, language, status])

  const handleCancel = () => {
    if (currentRequestId) cancelMatch(currentRequestId)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('idle')
    setMatch(null)
  }

  const handleEndSession = () => {
    setStatus('session_ended')
  }

  const handleSubmitRating = () => {
    if (!sessionId || rating === 0) return
    submitRating(sessionId, rating)
    setRatingSubmitted(true)
  }

  const handleJoinQueue = () => {
    setStatus('searching')
    handleFindBuddy()
  }

  const handleUseAI = () => {
    // Navigate to AI assistant — dispatch a custom event the AIAssistantButton listens to
    window.dispatchEvent(new CustomEvent('open-ai-assistant'))
  }

  const handleReset = () => {
    setStatus('idle')
    setMatch(null)
    setRating(0)
    setRatingSubmitted(false)
    setSessionId(null)
    setCurrentRequestId(null)
    setErrorMsg(null)
  }

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buddy System</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Get matched with a volunteer communication buddy who can assist you.
        </p>

        {/* ── Error ── */}
        {errorMsg && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* ── IDLE: Match Request Form (6.6.1) ── */}
        {status === 'idle' && (
          <section aria-labelledby="match-form-heading" className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
            <h2 id="match-form-heading" className="text-lg font-semibold text-gray-800">
              Find a Buddy
            </h2>

            {/* Disability type selector */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-2">
                Your disability type(s) <span className="text-gray-400 font-normal">(optional)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {DISABILITY_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selectedDisabilities.includes(value)}
                    onClick={() => toggleDisability(value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedDisabilities.includes(value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Language selector */}
            <div>
              <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleFindBuddy}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Find Buddy
            </button>
          </section>
        )}

        {/* ── SEARCHING: Countdown (6.6.5) ── */}
        {status === 'searching' && (
          <section
            aria-live="polite"
            aria-labelledby="searching-heading"
            className="bg-white rounded-2xl shadow-sm p-5 text-center space-y-4"
          >
            <h2 id="searching-heading" className="text-lg font-semibold text-gray-800">
              Searching for a buddy…
            </h2>
            <div
              role="timer"
              aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
              className="text-4xl font-mono font-bold text-blue-600"
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-500">
              We'll find a volunteer within 5 minutes.
            </p>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
          </section>
        )}

        {/* ── MATCHED: Volunteer info + session (6.6.2, 6.6.3) ── */}
        {status === 'matched' && match && (
          <section
            aria-live="polite"
            aria-labelledby="matched-heading"
            className="bg-white rounded-2xl shadow-sm p-5 space-y-4"
          >
            <h2 id="matched-heading" className="text-lg font-semibold text-green-700">
              ✅ Buddy found!
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-900">{match.volunteer.name}</p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Supports:</span>{' '}
                {match.volunteer.supportedDisabilityTypes.join(', ')}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Languages:</span>{' '}
                {match.volunteer.languages.join(', ')}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Communication preferences:</span>{' '}
                {match.volunteer.communicationPreferences.join(', ')}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Matched at {new Date(match.matchedAt).toLocaleTimeString()}
            </p>
            <button
              type="button"
              onClick={handleEndSession}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              End Session
            </button>
          </section>
        )}

        {/* ── TIMEOUT: No volunteer (6.6.5, Req 17.4) ── */}
        {status === 'timeout' && (
          <section
            role="alert"
            aria-labelledby="timeout-heading"
            className="bg-white rounded-2xl shadow-sm p-5 space-y-4 text-center"
          >
            <h2 id="timeout-heading" className="text-lg font-semibold text-orange-700">
              No volunteer available
            </h2>
            <p className="text-sm text-gray-600">
              We couldn't find a buddy within 5 minutes. You can join the queue or use the AI Assistant.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleJoinQueue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Join Queue
              </button>
              <button
                type="button"
                onClick={handleUseAI}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Use AI Assistant
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-gray-500 underline focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
              >
                Start over
              </button>
            </div>
          </section>
        )}

        {/* ── SESSION ENDED: Rating UI (6.6.4, Req 17.3) ── */}
        {status === 'session_ended' && (
          <section
            aria-labelledby="rating-heading"
            className="bg-white rounded-2xl shadow-sm p-5 space-y-4"
          >
            <h2 id="rating-heading" className="text-lg font-semibold text-gray-800">
              Rate your session
            </h2>
            {ratingSubmitted ? (
              <div role="status" aria-live="polite" className="text-center space-y-3">
                <p className="text-2xl">🎉</p>
                <p className="text-gray-700 font-medium">Thanks for your feedback!</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Find another buddy
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  How was your session with{' '}
                  <span className="font-medium">{match?.volunteer.name ?? 'your buddy'}</span>?
                </p>
                <StarRating value={rating} onChange={setRating} />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitRating}
                    disabled={rating === 0}
                    aria-disabled={rating === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Submit Rating
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
