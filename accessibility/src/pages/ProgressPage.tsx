import { useState, useEffect, useCallback } from 'react'
import type { PracticeSession } from '@/types'
import {
  getSessions,
  recordSession,
  computeSummary,
  checkMilestone,
  exportToCSV,
  type ProgressSummary,
} from '@/services/progressService'

const DEFAULT_THRESHOLD = 0.8

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  summary: ProgressSummary
  label: string
}

function SummaryCard({ summary, label }: SummaryCardProps) {
  const mins = Math.floor(summary.totalDurationSeconds / 60)
  const secs = summary.totalDurationSeconds % 60
  const pct = Math.round(summary.averageAccuracy * 100)

  return (
    <article
      aria-label={`${label} summary`}
      className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex flex-col gap-2"
    >
      <h3 className="font-semibold text-base text-gray-700">{label}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-gray-500">Sessions</dt>
        <dd className="font-medium">{summary.totalSessions}</dd>
        <dt className="text-gray-500">Duration</dt>
        <dd className="font-medium">
          {mins}m {secs}s
        </dd>
        <dt className="text-gray-500">Avg accuracy</dt>
        <dd className="font-medium">{pct}%</dd>
      </dl>
    </article>
  )
}

// ─── Add Session Form ─────────────────────────────────────────────────────────

interface AddSessionFormProps {
  onAdd: (session: PracticeSession) => void
}

function AddSessionForm({ onAdd }: AddSessionFormProps) {
  const [type, setType] = useState<'sign-language' | 'speech-therapy'>('sign-language')
  const [duration, setDuration] = useState('')
  const [accuracy, setAccuracy] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dur = parseInt(duration, 10)
    const acc = parseFloat(accuracy)

    if (!duration || isNaN(dur) || dur <= 0) {
      setError('Duration must be a positive number of seconds.')
      return
    }
    if (!accuracy || isNaN(acc) || acc < 0 || acc > 100) {
      setError('Accuracy must be a number between 0 and 100.')
      return
    }

    setError('')
    const session: PracticeSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: localStorage.getItem('userId') ?? 'local-user',
      type,
      date: Date.now(),
      durationSeconds: dur,
      accuracyScore: acc / 100,
    }
    onAdd(session)
    setDuration('')
    setAccuracy('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Add practice session"
      className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex flex-col gap-3"
    >
      <h3 className="font-semibold text-base text-gray-700">Add Session</h3>

      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="session-type" className="text-sm font-medium text-gray-600">
          Type
        </label>
        <select
          id="session-type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
        >
          <option value="sign-language">Sign Language</option>
          <option value="speech-therapy">Speech Therapy</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="session-duration" className="text-sm font-medium text-gray-600">
          Duration (seconds)
        </label>
        <input
          id="session-duration"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 300"
          className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="session-accuracy" className="text-sm font-medium text-gray-600">
          Accuracy (0–100)
        </label>
        <input
          id="session-accuracy"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={accuracy}
          onChange={(e) => setAccuracy(e.target.value)}
          placeholder="e.g. 85"
          className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold min-h-[44px] hover:bg-blue-700 transition-colors"
      >
        Save Session
      </button>
    </form>
  )
}

// ─── Progress Page ────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [threshold] = useState(DEFAULT_THRESHOLD)
  const [milestoneVisible, setMilestoneVisible] = useState(false)

  const refresh = useCallback(() => {
    const loaded = getSessions()
    setSessions(loaded)
    setMilestoneVisible(checkMilestone(loaded, threshold))
  }, [threshold])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleAdd(session: PracticeSession) {
    await recordSession(session)
    refresh()
  }

  function handleExport() {
    const csv = exportToCSV(sessions)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'progress.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary7d = computeSummary(sessions, '7d', threshold)
  const summary30d = computeSummary(sessions, '30d', threshold)
  const summaryAll = computeSummary(sessions, 'all', threshold)

  return (
    <main id="main-content" className="min-h-screen pb-20 p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Progress Tracker</h1>
        <button
          onClick={handleExport}
          aria-label="Export progress data as CSV"
          disabled={sessions.length === 0}
          className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-semibold min-h-[44px] hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </header>

      {/* Milestone notification banner */}
      {milestoneVisible && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-3 bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-4 py-3"
        >
          <span aria-hidden="true" className="text-2xl">🏆</span>
          <p className="font-semibold text-yellow-800">
            Milestone reached! You hit {Math.round(threshold * 100)}% accuracy or above.
          </p>
          <button
            onClick={() => setMilestoneVisible(false)}
            aria-label="Dismiss milestone notification"
            className="ml-auto text-yellow-700 hover:text-yellow-900 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section aria-labelledby="summaries-heading" className="mb-6">
        <h2 id="summaries-heading" className="text-lg font-semibold mb-3">
          Your Progress
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard summary={summary7d} label="Last 7 days" />
          <SummaryCard summary={summary30d} label="Last 30 days" />
          <SummaryCard summary={summaryAll} label="All time" />
        </div>
      </section>

      {/* Add session form */}
      <section aria-labelledby="add-session-heading" className="mb-6">
        <h2 id="add-session-heading" className="sr-only">
          Record a new session
        </h2>
        <AddSessionForm onAdd={handleAdd} />
      </section>

      {/* Session history */}
      {sessions.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-lg font-semibold mb-3">
            Session History
          </h2>
          <ul className="flex flex-col gap-2" aria-label="Practice session history">
            {[...sessions]
              .sort((a, b) => b.date - a.date)
              .map((s) => (
                <li
                  key={s.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-medium capitalize">
                    {s.type.replace('-', ' ')}
                  </span>
                  <span className="text-gray-500">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                  <span>{Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s</span>
                  <span
                    className={
                      s.accuracyScore >= threshold
                        ? 'text-green-600 font-semibold'
                        : 'text-gray-600'
                    }
                  >
                    {Math.round(s.accuracyScore * 100)}%
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  )
}
