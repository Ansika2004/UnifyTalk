/**
 * FeedbackPrompt Component
 * Requirement 23: Feedback Ratings
 *
 * - Shown after a communication session ends
 * - Optional: user can dismiss without rating (Requirement 23.2)
 * - Collects 1–5 star rating + optional free-text comment (Requirement 23.1)
 * - Submits anonymized feedback via analyticsService (Requirement 23.3)
 */

import { useState } from 'react'
import { submitFeedback } from '@/services/analyticsService'

export interface FeedbackPromptProps {
  feature: string           // e.g. 'tts', 'sign-language', 'chat'
  userId?: string           // used only for consent check, never stored
  onDismiss: () => void
  onSubmit?: (rating: number, comment: string) => void
}

export function FeedbackPrompt({ feature, userId, onDismiss, onSubmit }: FeedbackPromptProps) {
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (rating === 0) return
    setSubmitting(true)
    await submitFeedback({ rating, comment: comment.trim() || undefined, feature }, userId)
    onSubmit?.(rating, comment)
    setSubmitted(true)
    setSubmitting(false)
    setTimeout(onDismiss, 1500)
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-xl text-center"
        style={{ minWidth: '280px' }}
      >
        <span className="text-2xl" aria-hidden="true">✅</span>
        <p className="mt-1 font-semibold">Thanks for your feedback!</p>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl shadow-2xl p-6"
      style={{
        minWidth: '300px',
        maxWidth: '360px',
        background: 'var(--color-bg, #fff)',
        border: '2px solid var(--color-border, #e5e7eb)',
        color: 'var(--color-text, #111)',
      }}
    >
      <h2
        id="feedback-title"
        className="font-bold text-lg mb-1"
        style={{ color: 'var(--color-text, #111)' }}
      >
        How was your session?
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
        Your feedback is optional and anonymous.
      </p>

      {/* Star rating */}
      <div
        role="group"
        aria-label="Session rating from 1 to 5"
        className="flex gap-2 mb-4 justify-center"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-pressed={rating === star}
            onClick={() => setRating(star)}
            className="text-3xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Optional comment */}
      <label htmlFor="feedback-comment" className="block text-sm font-medium mb-1">
        Comment (optional)
      </label>
      <textarea
        id="feedback-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more…"
        rows={3}
        maxLength={500}
        className="w-full rounded-lg border p-2 text-sm resize-none mb-4"
        style={{
          borderColor: 'var(--color-border, #e5e7eb)',
          background: 'var(--color-bg, #fff)',
          color: 'var(--color-text, #111)',
        }}
        aria-label="Optional feedback comment"
      />

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg border text-sm font-medium"
          style={{
            borderColor: 'var(--color-border, #e5e7eb)',
            color: 'var(--color-text, #111)',
            minHeight: '44px',
          }}
          aria-label="Dismiss feedback prompt"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{
            background: 'var(--color-primary, #6366f1)',
            minHeight: '44px',
          }}
          aria-label={rating === 0 ? 'Select a rating to submit' : `Submit ${rating} star rating`}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

export default FeedbackPrompt
