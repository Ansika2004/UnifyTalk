/**
 * MedicationReminder — full-screen reminder notification.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import { useEffect, useRef, useState } from 'react'
import { collection, addDoc, Timestamp } from '@firebase/firestore'
import { ttsEngine } from '../services/ttsEngine'
import { buildDoseEvent } from '../services/medicationLogic'
import type { MedicationSchedule, DoseEvent } from '../types'

// Firestore db — imported lazily to avoid breaking tests without Firebase config
let _db: any | null = null
async function getDb() {
  if (_db) return _db
  const { firebaseApp } = await import('../firebase')
  const { getFirestore } = await import('@firebase/firestore')
  _db = getFirestore(firebaseApp) as any
  return _db!
}

const MISSED_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

export interface MedicationReminderProps {
  schedule: MedicationSchedule
  scheduledTime: Timestamp
  onTaken: () => void
  onNeedNurse: () => void
}

export default function MedicationReminder({
  schedule,
  scheduledTime,
  onTaken,
  onNeedNurse,
}: MedicationReminderProps) {
  const [dismissed, setDismissed] = useState(false)
  const [redisplayed, setRedisplayed] = useState(false)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const redisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true

    // TTS reads reminder aloud on mount (Req 9.2)
    ttsEngine.speak(
      `Medication reminder: ${schedule.name}, ${schedule.dosage}. ${schedule.instructions}`,
    )

    // 15-minute no-response timeout (Req 9.5)
    timeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || dismissed) return
      // Re-display once
      setRedisplayed(true)
      // Log missed dose
      await writeDoseEvent('missed')
    }, MISSED_TIMEOUT_MS)

    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (redisplayTimeoutRef.current) clearTimeout(redisplayTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function writeDoseEvent(status: DoseEvent['status'], confirmedAt?: Timestamp) {
    try {
      const db = await getDb()
      const event = buildDoseEvent(
        schedule.medicationId,
        schedule.patientId,
        scheduledTime,
        status,
      )
      const payload: DoseEvent = confirmedAt ? { ...event, confirmedAt } : event
      await addDoc(collection(db as any, 'dose_events'), payload)
    } catch (err) {
      console.error('Failed to write dose event:', err)
    }
  }

  async function handleTaken() {
    setLoading(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await writeDoseEvent('taken', Timestamp.now())
    if (mountedRef.current) {
      setDismissed(true)
      setLoading(false)
    }
    onTaken()
  }

  async function handleNeedNurse() {
    setLoading(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await writeDoseEvent('nurse_requested')
    // Stub FCM — log to console (Req 9.4)
    console.log('[FCM stub] Nurse requested for patient:', schedule.patientId)
    if (mountedRef.current) {
      setDismissed(true)
      setLoading(false)
    }
    onNeedNurse()
  }

  if (dismissed) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Medication reminder"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1e3a5f',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      {redisplayed && (
        <div
          role="alert"
          style={{
            background: '#b91c1c',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
          }}
        >
          Reminder: You haven't responded yet
        </div>
      )}

      <h1 style={{ fontSize: '2rem', margin: 0 }}>💊 Medication Time</h1>

      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{schedule.name}</div>
      <div style={{ fontSize: '1.25rem' }}>{schedule.dosage}</div>
      <div style={{ fontSize: '1rem', maxWidth: '480px', lineHeight: 1.6 }}>
        {schedule.instructions}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handleTaken}
          disabled={loading}
          aria-label="Mark medication as taken"
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.25rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '160px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          ✓ Taken
        </button>
        <button
          onClick={handleNeedNurse}
          disabled={loading}
          aria-label="Request nurse assistance"
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.25rem',
            borderRadius: '0.75rem',
            border: '2px solid #fff',
            background: 'transparent',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '160px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          🔔 Need Nurse
        </button>
      </div>
    </div>
  )
}
