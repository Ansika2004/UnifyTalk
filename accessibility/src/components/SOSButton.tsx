import { useState } from 'react'
import { buildSOSAlert, dispatchSOSAlert, isSOSEnabled } from '@/services/sosService'
import type { EmergencyContact } from '@/types'

interface SOSButtonProps {
  hasEmergencyContacts?: boolean
  emergencyContacts?: EmergencyContact[]
  userId?: string
  onSOS?: () => void
}

interface SOSConfirmation {
  contacts: EmergencyContact[]
  timestamp: number
  locationAvailable: boolean
}

/**
 * Persistent SOS button — always visible on every page.
 * Requirements: 19.1, 19.3, 19.4, 19.5
 */
export function SOSButton({
  hasEmergencyContacts = true,
  emergencyContacts = [],
  userId = 'local-user',
  onSOS,
}: SOSButtonProps) {
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)
  const [activated, setActivated] = useState(false)
  const [confirmation, setConfirmation] = useState<SOSConfirmation | null>(null)

  const enabled = hasEmergencyContacts && isSOSEnabled(emergencyContacts)

  async function handleClick() {
    if (!hasEmergencyContacts) {
      setShowSetupPrompt(true)
      return
    }
    setActivated(true)

    // Try to get GPS location
    let location: { latitude: number; longitude: number } | undefined
    try {
      location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          reject,
          { timeout: 5000 },
        )
      })
    } catch {
      // Location unavailable — send without coordinates (requirement 19.5)
      location = undefined
    }

    const alert = buildSOSAlert(userId, emergencyContacts, location)
    await dispatchSOSAlert(alert)

    setConfirmation({
      contacts: emergencyContacts,
      timestamp: alert.timestamp,
      locationAvailable: alert.locationAvailable,
    })

    // Notify CaregiverPage (task 6.7.3)
    window.dispatchEvent(
      new CustomEvent('sos-activated', {
        detail: { timestamp: alert.timestamp, locationAvailable: alert.locationAvailable },
      }),
    )

    onSOS?.()
    setTimeout(() => setActivated(false), 3000)
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Emergency SOS"
        style={{
          position: 'fixed',
          bottom: '5rem',
          right: '1rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: activated ? '#16a34a' : '#dc2626',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '0.75rem',
          fontWeight: 900,
          boxShadow: '0 4px 12px rgba(220,38,38,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activated ? '✓' : 'SOS'}
      </button>

      {/* Setup prompt when no contacts */}
      {showSetupPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Emergency contact setup required"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '360px', width: '100%' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>
              Set up emergency contacts
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#374151' }}>
              You need at least one emergency contact to use the SOS feature.
            </p>
            <button
              onClick={() => setShowSetupPrompt(false)}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #6b7280', background: 'transparent', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation screen — requirement 19.4 */}
      {confirmation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="SOS confirmation"
          data-testid="sos-confirmation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '360px', width: '100%' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
              🚨 SOS Alert Sent
            </h2>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#374151' }}>
              <strong>Time:</strong> {new Date(confirmation.timestamp).toLocaleTimeString()}
            </p>
            {!confirmation.locationAvailable && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#b45309' }}>
                ⚠️ Location unavailable — alert sent without coordinates.
              </p>
            )}
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Notified contacts:</p>
            <ul style={{ margin: '0 0 1rem', paddingLeft: '1.25rem' }}>
              {confirmation.contacts.map((c) => (
                <li key={c.id} style={{ fontSize: '0.9rem', color: '#374151' }}>{c.name}</li>
              ))}
            </ul>
            <button
              onClick={() => setConfirmation(null)}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default SOSButton
