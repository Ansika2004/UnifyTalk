/**
 * GestureDataSummary.tsx
 * Shows a summary of collected gesture sessions and provides a deletion button.
 *
 * Requirements: 24.2 (deletion mechanism), 24.4 (summary view)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getGestureDataSummary,
  requestGestureDataDeletion,
  type GestureDataSummary as Summary,
} from '@/services/gestureDataService'

interface GestureDataSummaryProps {
  userId: string | null
  /** Called after successful deletion so parent can update consent state */
  onDeleted?: () => void
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function GestureDataSummary({ userId, onDeleted }: GestureDataSummaryProps) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)

  const loadSummary = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const s = await getGestureDataSummary(userId)
      setSummary(s)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  async function handleDeleteRequest() {
    if (!userId) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await requestGestureDataDeletion(userId)
      setDeleteSuccess(true)
      setSummary({ count: 0, dateRange: null })
      onDeleted?.()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (!userId) return null

  return (
    <section
      aria-labelledby="gesture-summary-heading"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-2"
    >
      <h3 id="gesture-summary-heading" className="font-semibold text-sm mb-2">
        Collected Gesture Data
      </h3>

      {loading && (
        <p role="status" aria-live="polite" className="text-xs text-gray-500">
          Loading summary…
        </p>
      )}

      {!loading && summary !== null && (
        <dl className="text-sm text-gray-700 space-y-1 mb-3">
          <div className="flex gap-2">
            <dt className="font-medium">Sessions collected:</dt>
            <dd aria-label={`${summary.count} sessions collected`}>{summary.count}</dd>
          </div>
          {summary.dateRange ? (
            <div className="flex gap-2">
              <dt className="font-medium">Date range:</dt>
              <dd aria-label={`From ${formatDate(summary.dateRange.from)} to ${formatDate(summary.dateRange.to)}`}>
                {formatDate(summary.dateRange.from)} – {formatDate(summary.dateRange.to)}
              </dd>
            </div>
          ) : (
            <div className="flex gap-2">
              <dt className="font-medium">Date range:</dt>
              <dd className="text-gray-400">No data collected yet</dd>
            </div>
          )}
        </dl>
      )}

      {deleteSuccess ? (
        <p role="status" aria-live="polite" className="text-xs text-green-700 font-medium">
          All gesture data has been deleted.
        </p>
      ) : (
        <button
          onClick={handleDeleteRequest}
          disabled={deleting || loading || summary?.count === 0}
          aria-label="Request deletion of all collected gesture data"
          className="rounded bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting…' : 'Request Data Deletion'}
        </button>
      )}

      {deleteError && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {deleteError}
        </p>
      )}
    </section>
  )
}

export default GestureDataSummary
