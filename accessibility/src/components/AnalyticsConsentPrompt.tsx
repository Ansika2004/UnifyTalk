/**
 * AnalyticsConsentPrompt Component
 * Requirement 22.2: Explicit user consent before collecting any analytics data.
 *
 * Shown once when the user has not yet made a consent decision.
 * Stores the decision at users/{userId}/analyticsConsent in Firestore.
 */

import { setAnalyticsConsent } from '@/services/analyticsService'

export interface AnalyticsConsentPromptProps {
  userId: string
  onDecision: (consented: boolean) => void
}

export function AnalyticsConsentPrompt({ userId, onDecision }: AnalyticsConsentPromptProps) {
  async function handleAccept() {
    await setAnalyticsConsent(userId, true)
    onDecision(true)
  }

  async function handleDecline() {
    await setAnalyticsConsent(userId, false)
    onDecision(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        className="rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        style={{
          background: 'var(--color-bg, #fff)',
          color: 'var(--color-text, #111)',
          border: '2px solid var(--color-border, #e5e7eb)',
        }}
      >
        <h2
          id="consent-title"
          className="font-bold text-xl mb-3"
          style={{ color: 'var(--color-text, #111)' }}
        >
          Help us improve UnifyTalk
        </h2>
        <p id="consent-desc" className="text-sm mb-4" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          We'd like to collect <strong>anonymous</strong> usage data (feature usage, session
          durations) to improve the platform. No personal information is ever stored.
          You can change this at any time in Settings.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
            style={{
              borderColor: 'var(--color-border, #e5e7eb)',
              color: 'var(--color-text, #111)',
              minHeight: '44px',
            }}
            aria-label="Decline analytics collection"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'var(--color-primary, #6366f1)',
              minHeight: '44px',
            }}
            aria-label="Accept analytics collection"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsConsentPrompt
