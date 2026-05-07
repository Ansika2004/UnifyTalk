import { useEffect, useState } from 'react'
import { useAccessibilityStore } from '../store/accessibilityStore'
import { getAnalyticsConsent, setAnalyticsConsent } from '@/services/analyticsService'

export default function SettingsPage() {
  const { preferences, setFontSize, setContrastMode, setAudioSpeed, setTtsEnabled } =
    useAccessibilityStore()

  const userId = localStorage.getItem('userId') ?? undefined
  const [analyticsConsent, setAnalyticsConsentState] = useState<boolean | null>(null)
  const [consentSaving, setConsentSaving] = useState(false)

  useEffect(() => {
    if (!userId) { setAnalyticsConsentState(false); return }
    getAnalyticsConsent(userId).then(setAnalyticsConsentState)
  }, [userId])

  async function handleToggleAnalytics() {
    if (!userId) return
    const newValue = !analyticsConsent
    setConsentSaving(true)
    await setAnalyticsConsent(userId, newValue)
    setAnalyticsConsentState(newValue)
    setConsentSaving(false)
  }

  return (
    <main id="main-content" className="p-4 max-w-lg mx-auto pb-20">
      <h1 className="font-bold mb-6" style={{ fontSize: 'calc(var(--font-size-base) * 1.3)', color: 'var(--color-text)' }}>
        Accessibility Settings
      </h1>

      {/* Font size */}
      <section className="mb-6" aria-labelledby="font-size-label">
        <h2 id="font-size-label" className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Font Size
        </h2>
        <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="font-size-label">
          {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              aria-pressed={preferences.fontSize === size}
              className="px-4 py-2 rounded-lg border-2 min-h-touch"
              style={{
                borderColor: preferences.fontSize === size ? 'var(--color-primary)' : 'var(--color-border)',
                background: preferences.fontSize === size ? 'var(--color-primary)' : 'var(--color-bg)',
                color: preferences.fontSize === size ? '#fff' : 'var(--color-text)',
              }}
            >
              {size === 'extra-large' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Contrast mode */}
      <section className="mb-6" aria-labelledby="contrast-label">
        <h2 id="contrast-label" className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Contrast Mode
        </h2>
        <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="contrast-label">
          {(['normal', 'high-contrast', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setContrastMode(mode)}
              aria-pressed={preferences.contrastMode === mode}
              className="px-4 py-2 rounded-lg border-2 min-h-touch capitalize"
              style={{
                borderColor: preferences.contrastMode === mode ? 'var(--color-primary)' : 'var(--color-border)',
                background: preferences.contrastMode === mode ? 'var(--color-primary)' : 'var(--color-bg)',
                color: preferences.contrastMode === mode ? '#fff' : 'var(--color-text)',
              }}
            >
              {mode === 'high-contrast' ? 'High Contrast' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Audio speed */}
      <section className="mb-6" aria-labelledby="speed-label">
        <h2 id="speed-label" className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Speech Speed: {preferences.audioSpeed.toFixed(1)}x
        </h2>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={preferences.audioSpeed}
          onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
          aria-label="Speech speed"
          className="w-full"
          style={{ minHeight: '44px' }}
        />
      </section>

      {/* TTS toggle */}
      <section className="mb-6" aria-labelledby="tts-label">
        <h2 id="tts-label" className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Text-to-Speech
        </h2>
        <button
          onClick={() => setTtsEnabled(!preferences.ttsEnabled)}
          aria-pressed={preferences.ttsEnabled}
          className="px-4 py-2 rounded-lg border-2 min-h-touch"
          style={{
            borderColor: 'var(--color-primary)',
            background: preferences.ttsEnabled ? 'var(--color-primary)' : 'var(--color-bg)',
            color: preferences.ttsEnabled ? '#fff' : 'var(--color-text)',
          }}
        >
          {preferences.ttsEnabled ? '🔊 TTS Enabled' : '🔇 TTS Disabled'}
        </button>
      </section>

      {/* Analytics opt-out (Requirement 22.2) */}
      <section className="mb-6" aria-labelledby="analytics-label">
        <h2 id="analytics-label" className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Usage Analytics
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          Allow anonymous data collection to help improve the platform. No personal
          information is ever stored.
        </p>
        {analyticsConsent === null ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Loading…</p>
        ) : (
          <button
            onClick={handleToggleAnalytics}
            disabled={consentSaving || !userId}
            aria-pressed={analyticsConsent}
            aria-label={analyticsConsent ? 'Disable analytics collection' : 'Enable analytics collection'}
            className="px-4 py-2 rounded-lg border-2 min-h-touch disabled:opacity-50"
            style={{
              borderColor: 'var(--color-primary)',
              background: analyticsConsent ? 'var(--color-primary)' : 'var(--color-bg)',
              color: analyticsConsent ? '#fff' : 'var(--color-text)',
            }}
          >
            {consentSaving ? 'Saving…' : analyticsConsent ? '📊 Analytics On' : '📊 Analytics Off'}
          </button>
        )}
      </section>
    </main>
  )
}
