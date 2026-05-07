import { useState, useEffect, useCallback } from 'react'

const CONSENT_KEY = 'caregiver_access_consent'
const SOS_HISTORY_KEY = 'sos_activation_history'

interface ChatMessage {
  id: string
  text: string
  timestamp: number
  sender: string
}

interface SOSEvent {
  timestamp: number
  locationAvailable: boolean
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem('chat_messages')
    if (!raw) return []
    return JSON.parse(raw) as ChatMessage[]
  } catch {
    return []
  }
}

function loadSOSHistory(): SOSEvent[] {
  try {
    const raw = localStorage.getItem(SOS_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SOSEvent[]
  } catch {
    return []
  }
}

/**
 * CaregiverPage — Caregiver/Companion Mode
 * Requirements: 6.7.1 (consent-gated access), 6.7.2 (simplified large-control view),
 *               6.7.3 (SOS notification)
 */
export default function CaregiverPage() {
  const [consentGranted, setConsentGranted] = useState<boolean>(() => {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sosHistory, setSOSHistory] = useState<SOSEvent[]>([])
  const [sosNotification, setSOSNotification] = useState<SOSEvent | null>(null)

  // Load data when consent is granted
  useEffect(() => {
    if (!consentGranted) return
    setMessages(loadMessages())
    setSOSHistory(loadSOSHistory())
  }, [consentGranted])

  // Listen for SOS activation events dispatched by SOSButton (task 6.7.3)
  const handleSOSActivated = useCallback((e: Event) => {
    const detail = (e as CustomEvent<SOSEvent>).detail ?? { timestamp: Date.now(), locationAvailable: false }
    const event: SOSEvent = { timestamp: detail.timestamp ?? Date.now(), locationAvailable: detail.locationAvailable ?? false }

    // Persist to history
    const updated = [event, ...loadSOSHistory()].slice(0, 20)
    localStorage.setItem(SOS_HISTORY_KEY, JSON.stringify(updated))
    setSOSHistory(updated)
    setSOSNotification(event)
  }, [])

  useEffect(() => {
    window.addEventListener('sos-activated', handleSOSActivated)
    return () => window.removeEventListener('sos-activated', handleSOSActivated)
  }, [handleSOSActivated])

  function grantConsent() {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsentGranted(true)
  }

  function revokeConsent() {
    localStorage.removeItem(CONSENT_KEY)
    setConsentGranted(false)
    setMessages([])
    setSOSHistory([])
    setSOSNotification(null)
  }

  // ── Consent gate (task 6.7.1) ──────────────────────────────────────────────
  if (!consentGranted) {
    return (
      <main
        id="main-content"
        aria-labelledby="caregiver-page-title"
        style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', paddingBottom: '5rem' }}
      >
        <h1
          id="caregiver-page-title"
          style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text)' }}
        >
          Caregiver Mode
        </h1>

        <div
          role="region"
          aria-label="Caregiver access disabled"
          style={{
            border: '2px solid var(--color-border, #d1d5db)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            background: 'var(--color-bg, #fff)',
          }}
        >
          <p
            style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text)' }}
            aria-live="polite"
          >
            Caregiver access not enabled
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
            This mode allows a caregiver or companion to view a summary of recent communication
            history and receive notifications when the SOS button is activated. The user must
            explicitly enable this access. No data is shared without consent.
          </p>
          <button
            onClick={grantConsent}
            aria-label="Enable caregiver access"
            style={{
              minHeight: '56px',
              minWidth: '200px',
              fontSize: '1.125rem',
              fontWeight: 700,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Enable Caregiver Access
          </button>
        </div>
      </main>
    )
  }

  // ── Caregiver view (tasks 6.7.2 + 6.7.3) ──────────────────────────────────
  const recentMessages = messages.slice(-10).reverse()
  const lastSOS = sosHistory[0]

  return (
    <main
      id="main-content"
      aria-labelledby="caregiver-page-title"
      style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto', paddingBottom: '5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1
          id="caregiver-page-title"
          style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}
        >
          Caregiver View
        </h1>
        <button
          onClick={revokeConsent}
          aria-label="Revoke caregiver access"
          style={{
            minHeight: '48px',
            minWidth: '160px',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            background: 'transparent',
            color: '#dc2626',
            border: '2px solid #dc2626',
            cursor: 'pointer',
          }}
        >
          Revoke Access
        </button>
      </div>

      {/* SOS live notification banner (task 6.7.3) */}
      {sosNotification && (
        <div
          role="alert"
          aria-live="assertive"
          aria-label="SOS alert notification"
          style={{
            background: '#dc2626',
            color: '#fff',
            borderRadius: '0.75rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              🚨 SOS Activated
            </p>
            <p style={{ fontSize: '1rem', margin: 0 }}>
              At {new Date(sosNotification.timestamp).toLocaleTimeString()}
              {!sosNotification.locationAvailable && ' — location unavailable'}
            </p>
          </div>
          <button
            onClick={() => setSOSNotification(null)}
            aria-label="Dismiss SOS notification"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              fontSize: '1.25rem',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              padding: '0.25rem 0.75rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SOS history section */}
      <section
        aria-labelledby="sos-history-heading"
        style={{
          border: '2px solid var(--color-border, #d1d5db)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          background: 'var(--color-bg, #fff)',
        }}
      >
        <h2
          id="sos-history-heading"
          style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)', margin: '0 0 0.75rem' }}
        >
          SOS History
        </h2>
        {lastSOS ? (
          <p
            aria-label={`Last SOS activated at ${new Date(lastSOS.timestamp).toLocaleString()}`}
            style={{ fontSize: '1.125rem', color: 'var(--color-text)', margin: 0 }}
          >
            Last activated: <strong>{new Date(lastSOS.timestamp).toLocaleString()}</strong>
            {!lastSOS.locationAvailable && (
              <span style={{ color: '#b45309', marginLeft: '0.5rem' }}>(no location)</span>
            )}
          </p>
        ) : (
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text)', margin: 0, opacity: 0.7 }}>
            No SOS activations recorded.
          </p>
        )}
      </section>

      {/* Communication history summary (task 6.7.1 + 6.7.2) */}
      <section
        aria-labelledby="comm-history-heading"
        style={{
          border: '2px solid var(--color-border, #d1d5db)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          background: 'var(--color-bg, #fff)',
        }}
      >
        <h2
          id="comm-history-heading"
          style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--color-text)' }}
        >
          Recent Communication
        </h2>

        {recentMessages.length === 0 ? (
          <p
            aria-live="polite"
            style={{ fontSize: '1.125rem', color: 'var(--color-text)', margin: 0, opacity: 0.7 }}
          >
            No recent messages found.
          </p>
        ) : (
          <ul
            aria-label="Recent messages list"
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {recentMessages.map((msg) => (
              <li
                key={msg.id}
                aria-label={`Message from ${msg.sender} at ${new Date(msg.timestamp).toLocaleTimeString()}: ${msg.text}`}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'var(--color-surface, #f9fafb)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {msg.sender}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text)', opacity: 0.6 }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ fontSize: '1.125rem', margin: 0, color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {msg.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
