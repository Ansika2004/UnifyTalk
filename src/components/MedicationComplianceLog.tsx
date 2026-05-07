/**
 * MedicationComplianceLog — staff view of dose events, filterable by date.
 * Requirements: 9.6
 */
import { useState } from 'react'
import type { DoseEvent } from '../types'
import type { Timestamp } from 'firebase/firestore'

export interface MedicationComplianceLogProps {
  events: DoseEvent[]
}

function tsToDate(ts: Timestamp): Date {
  return ts.toDate()
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS: Record<DoseEvent['status'], string> = {
  taken: '✓ Taken',
  missed: '✗ Missed',
  nurse_requested: '🔔 Nurse Requested',
}

const STATUS_COLORS: Record<DoseEvent['status'], string> = {
  taken: '#16a34a',
  missed: '#b91c1c',
  nurse_requested: '#d97706',
}

export default function MedicationComplianceLog({ events }: MedicationComplianceLogProps) {
  const [filterDate, setFilterDate] = useState<string>('')

  const filtered = filterDate
    ? events.filter((e) => {
        const d = tsToDate(e.scheduledTime)
        return d.toISOString().startsWith(filterDate)
      })
    : events

  const sorted = [...filtered].sort(
    (a, b) => tsToDate(b.scheduledTime).getTime() - tsToDate(a.scheduledTime).getTime(),
  )

  return (
    <div style={{ padding: '1rem', fontFamily: 'inherit' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Medication Compliance Log</h2>

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label htmlFor="compliance-date-filter" style={{ fontSize: '1rem' }}>
          Filter by date:
        </label>
        <input
          id="compliance-date-filter"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ padding: '0.375rem 0.75rem', fontSize: '1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #6b7280', background: 'transparent', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>No dose events found.</p>
      ) : (
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}
          aria-label="Medication compliance log"
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.75rem' }}>Medication</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Scheduled</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((event, idx) => {
              const scheduledDate = tsToDate(event.scheduledTime)
              return (
                <tr
                  key={`${event.medicationId}-${event.scheduledTime.toMillis()}-${idx}`}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>{event.medicationId}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    {formatDate(scheduledDate)} {formatTime(scheduledDate)}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem 0.75rem',
                      color: STATUS_COLORS[event.status],
                      fontWeight: 'bold',
                    }}
                  >
                    {STATUS_LABELS[event.status]}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
