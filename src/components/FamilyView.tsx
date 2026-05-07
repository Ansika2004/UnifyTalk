/**
 * FamilyView — read-only family access view with messaging.
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6
 */
import { useEffect, useRef, useState } from 'react'
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  Timestamp,
} from '@firebase/firestore'
import { validateFamilyToken } from '../services/familyConnectService'
import type { FamilyAccessLink } from '../types'

const MAX_MESSAGE_LENGTH = 160

export interface FamilyViewProps {
  token: string
}

type ViewState = 'loading' | 'valid' | 'invalid' | 'revoked'

interface FamilyMessage {
  id?: string
  token: string
  patientId: string
  content: string
  sentAt: Timestamp
}

export default function FamilyView({ token }: FamilyViewProps) {
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [link, setLink] = useState<FamilyAccessLink | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [sentConfirm, setSentConfirm] = useState(false)
  const mountedRef = useRef(true)
  const unsubRevocationRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    mountedRef.current = true
    validateToken()
    return () => {
      mountedRef.current = false
      unsubRevocationRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function validateToken() {
    const validated = await validateFamilyToken(token)
    if (!mountedRef.current) return

    if (!validated) {
      setViewState('invalid')
      return
    }

    setLink(validated)
    setViewState('valid')
    subscribeToRevocation(validated.patientId)
  }

  function subscribeToRevocation(_patientId: string) {
    // Subscribe to Firestore link doc for real-time revocation (Req 14.6)
    import('../firebase').then(({ firebaseApp }) => {
      import('firebase/firestore').then(({ getFirestore }) => {
        const db = getFirestore(firebaseApp)
        const unsub = onSnapshot(doc(db, 'family_links', token), (snap) => {
          if (!mountedRef.current) return
          if (!snap.exists()) {
            setViewState('revoked')
            return
          }
          const data = snap.data() as FamilyAccessLink
          if (data.revokedAt) {
            setViewState('revoked')
          }
        })
        unsubRevocationRef.current = unsub
      })
    })
  }

  async function handleSendMessage() {
    if (!link || !messageText.trim() || messageText.length > MAX_MESSAGE_LENGTH) return
    setSending(true)
    try {
      const { firebaseApp } = await import('../firebase')
      const { getFirestore } = await import('firebase/firestore')
      const db = getFirestore(firebaseApp)
      const msg: FamilyMessage = {
        token,
        patientId: link.patientId,
        content: messageText.trim(),
        sentAt: Timestamp.now(),
      }
      await addDoc(collection(db, 'family_messages'), msg)
      setMessageText('')
      setSentConfirm(true)
      setTimeout(() => {
        if (mountedRef.current) setSentConfirm(false)
      }, 3000)
    } catch (err) {
      console.error('Failed to send family message:', err)
    } finally {
      if (mountedRef.current) setSending(false)
    }
  }

  if (viewState === 'loading') {
    return (
      <div role="status" aria-live="polite" style={{ padding: '2rem', textAlign: 'center' }}>
        Verifying access…
      </div>
    )
  }

  if (viewState === 'revoked') {
    return (
      <div
        role="alert"
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#fef2f2',
          color: '#b91c1c',
          fontSize: '1.25rem',
        }}
      >
        <h2>Access Revoked</h2>
        <p>Your access to this patient's information has been revoked.</p>
      </div>
    )
  }

  if (viewState === 'invalid' || !link) {
    return (
      <div
        role="alert"
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#fef2f2',
          color: '#b91c1c',
          fontSize: '1.25rem',
        }}
      >
        <h2>Invalid or Expired Link</h2>
        <p>This access link is no longer valid. Please request a new link from the patient or staff.</p>
      </div>
    )
  }

  const { consentSettings } = link

  return (
    <div style={{ padding: '1.5rem', maxWidth: '640px', margin: '0 auto', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Family View</h1>

      {/* Mood history (gated by consent) */}
      {consentSettings.showMoodHistory && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Mood Check-in History</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Recent mood check-ins will appear here.
          </p>
        </section>
      )}

      {/* Medication compliance (gated by consent) */}
      {consentSettings.showMedicationCompliance && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Medication Compliance</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Medication taken/missed status will appear here.
          </p>
        </section>
      )}

      {/* Chat history (gated by consent) */}
      {consentSettings.showChatHistory && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Recent Messages</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Doctor-patient chat history will appear here.
          </p>
        </section>
      )}

      {/* Family message input (Req 14.3) */}
      <section
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.5rem',
          marginTop: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Send a Message</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Write a supportive message (max 160 characters)…"
            rows={3}
            aria-label="Family message"
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {messageText.length}/{MAX_MESSAGE_LENGTH}
            </span>
            <button
              onClick={handleSendMessage}
              disabled={sending || !messageText.trim()}
              aria-label="Send message to patient"
              style={{
                padding: '0.625rem 1.5rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#1d4ed8',
                color: '#fff',
                cursor: sending || !messageText.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !messageText.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {sentConfirm && (
            <div
              role="status"
              aria-live="polite"
              style={{ color: '#16a34a', fontSize: '0.875rem' }}
            >
              ✓ Message sent to patient
            </div>
          )}
        </div>
      </section>

      {/* Explicitly no access to raw records, vitals, or clinical notes (Req 14.5) */}
    </div>
  )
}
