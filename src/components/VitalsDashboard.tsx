/**
 * VitalsDashboard — polls hospital API and displays vitals with color-coding.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
import { useEffect, useRef, useState } from 'react'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { computeVitalStatus, getReassuranceLabel } from '../services/vitalsLogic'
import type { VitalReading } from '../types'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

// Normal ranges per vital type
const NORMAL_RANGES: Record<VitalReading['type'], [number, number]> = {
  heart_rate: [60, 100],
  spo2: [95, 100],
  temperature: [36.1, 37.2],
}

const VITAL_LABELS: Record<VitalReading['type'], string> = {
  heart_rate: 'Heart Rate',
  spo2: 'SpO₂',
  temperature: 'Temperature',
}

const VITAL_UNITS: Record<VitalReading['type'], string> = {
  heart_rate: 'bpm',
  spo2: '%',
  temperature: '°C',
}

const STATUS_COLORS: Record<'normal' | 'warning' | 'critical', string> = {
  normal: '#16a34a',
  warning: '#d97706',
  critical: '#b91c1c',
}

export interface VitalsDashboardProps {
  patientId: string
}

interface VitalsState {
  readings: VitalReading[]
  lastUpdated: Date | null
  isStale: boolean
}

export default function VitalsDashboard({ patientId }: VitalsDashboardProps) {
  const [state, setState] = useState<VitalsState>({
    readings: [],
    lastUpdated: null,
    isStale: false,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchVitals()
    intervalRef.current = setInterval(fetchVitals, POLL_INTERVAL_MS)
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  async function fetchVitals() {
    const apiUrl = import.meta.env.VITE_HOSPITAL_API_URL
    if (!apiUrl) {
      await loadFromCache()
      return
    }

    try {
      const res = await fetch(`${apiUrl}/vitals?patientId=${patientId}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()

      const now = Timestamp.now()
      const readings: VitalReading[] = (
        ['heart_rate', 'spo2', 'temperature'] as VitalReading['type'][]
      )
        .filter((type) => data[type] !== undefined)
        .map((type) => {
          const value = data[type] as number
          const normalRange = NORMAL_RANGES[type]
          const status = computeVitalStatus(value, normalRange)
          return {
            type,
            value,
            unit: VITAL_UNITS[type],
            normalRange,
            status,
            timestamp: now,
          }
        })

      if (mountedRef.current) {
        setState({ readings, lastUpdated: new Date(), isStale: false })
      }

      // Cache to Firestore (Req 12.6)
      await cacheVitals(readings)
    } catch {
      // API unavailable — load from cache
      await loadFromCache()
    }
  }

  async function cacheVitals(readings: VitalReading[]) {
    try {
      const { firebaseApp } = await import('../firebase')
      const { getFirestore } = await import('firebase/firestore')
      const db = getFirestore(firebaseApp)
      await setDoc(doc(db, 'vitals_cache', patientId), {
        readings,
        lastUpdated: Timestamp.now(),
      })
    } catch {
      // Cache write failure is non-critical
    }
  }

  async function loadFromCache() {
    try {
      const { firebaseApp } = await import('../firebase')
      const { getFirestore } = await import('firebase/firestore')
      const db = getFirestore(firebaseApp)
      const snap = await getDoc(doc(db, 'vitals_cache', patientId))
      if (snap.exists() && mountedRef.current) {
        const data = snap.data()
        const lastUpdated = data.lastUpdated?.toDate?.() ?? null
        setState({
          readings: data.readings ?? [],
          lastUpdated,
          isStale: true,
        })
      }
    } catch {
      // Cache read failure — show empty state
    }
  }

  const { readings, lastUpdated, isStale } = state

  return (
    <div
      aria-label="Patient vitals dashboard"
      style={{ padding: '1.5rem', fontFamily: 'inherit' }}
    >
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Vitals</h2>

      {isStale && lastUpdated && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#92400e',
          }}
        >
          ⚠ Showing cached data — Last updated {lastUpdated.toLocaleString()}
        </div>
      )}

      {readings.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No vitals data available.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {readings.map((reading, index) => {
            const label = getReassuranceLabel(reading.type, reading.value, reading.status)
            return (
              <div
                key={reading.type}
                className="animated-section interactive-card"
                style={{
                  animationDelay: `${index * 0.15}s`,
                  border: `2px solid ${STATUS_COLORS[reading.status]}`,
                  borderRadius: '1rem',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
                aria-label={`${VITAL_LABELS[reading.type]}: ${reading.value} ${reading.unit}`}
              >
                <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {VITAL_LABELS[reading.type]}
                </div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: STATUS_COLORS[reading.status],
                  }}
                >
                  {reading.value}
                  <span style={{ fontSize: '1rem', marginLeft: '0.25rem', fontWeight: 'normal' }}>
                    {reading.unit}
                  </span>
                </div>
                {label && (
                  <div style={{ fontSize: '0.875rem', color: '#16a34a' }}>{label}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
