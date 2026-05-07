/**
 * StaffDashboard — placeholder sections for staff overview.
 * Requirements: 1.2, 2.6, 4.4, 6.5, 9.6
 */
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { firebaseConfigured, getDb } from '../firebase'
import MedicationComplianceLog from '../components/MedicationComplianceLog'

interface FirestoreItem {
  id: string
  data: DocumentData
}

function useFirestoreList(
  collectionPath: string,
  constraints: Parameters<typeof query>[1][],
): FirestoreItem[] {
  const [items, setItems] = useState<FirestoreItem[]>([])

  useEffect(() => {
    if (!firebaseConfigured) return
    const db = getDb()
    if (!db) return
    const ref = collection(db, collectionPath)
    const q = query(ref, ...constraints)
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath])

  return items
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  padding: '1.5rem',
}

const headingStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  marginBottom: '0.75rem',
  color: '#111827',
}

const listItemStyle: React.CSSProperties = {
  padding: '0.75rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '0.95rem',
  color: '#94a3b8',
  transition: 'color 0.2s',
}

const emptyStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.9rem',
}

const StaffDashboard: React.FC = () => {
  const sosAlerts = useFirestoreList('sos_alerts', [orderBy('timestamp', 'desc'), limit(10)])
  const symptomReports = useFirestoreList('symptom_reports', [orderBy('timestamp', 'desc'), limit(10)])
  const moodAlerts = useFirestoreList('notifications', [
    where('type', '==', 'mood_distress'),
    orderBy('timestamp', 'desc'),
    limit(10),
  ])

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', background: 'linear-gradient(90deg, #0ecfb0, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
        Staff Dashboard
      </h1>

      {/* SOS Alerts */}
      <section style={sectionStyle} aria-label="Incoming SOS alerts" className="animated-section interactive-card">
        <h2 style={{ ...headingStyle, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{animation: 'pulseGlow 2s infinite', borderRadius: '50%', background: '#ef4444', border: 'none', boxShadow: '0 0 10px #ef4444'}}>🚨</span> Incoming SOS Alerts</h2>
        {sosAlerts.length === 0 ? (
          <p style={emptyStyle}>No active SOS alerts.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sosAlerts.map((item) => (
              <li key={item.id} style={listItemStyle} onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                <strong style={{ color: '#f1f5f9' }}>{item.data.patientId}</strong> — Ward {item.data.wardId} —{' '}
                {item.data.selectedMessage}{' '}
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  ({item.data.deliveryStatus})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Doctor Bridge Chat */}
      <section style={sectionStyle} aria-label="Doctor Bridge chat" className="animated-section interactive-card">
        <h2 style={{...headingStyle, color: '#f1f5f9'}}>💬 Doctor Bridge Chat</h2>
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1rem' }}>
          View and respond to patient chat channels in real-time.
        </p>
        <Link
          to="/staff/chat"
          className="glowing-button"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#1d4ed8',
            color: '#fff',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          Open Patient Channels →
        </Link>
      </section>

      {/* Symptom Report Inbox */}
      <section style={sectionStyle} aria-label="Symptom report inbox" className="animated-section interactive-card">
        <h2 style={{...headingStyle, color: '#f1f5f9'}}>🩺 Symptom Report Inbox</h2>
        {symptomReports.length === 0 ? (
          <p style={emptyStyle}>No symptom reports.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {symptomReports.map((item) => (
              <li key={item.id} style={listItemStyle} onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                <strong style={{ color: '#f1f5f9' }}>{item.data.patientId}</strong> —{' '}
                {item.data.aiSummary ?? `${item.data.painType} pain, intensity ${item.data.intensity}/10`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mood Distress Notifications */}
      <section style={sectionStyle} aria-label="Mood distress notifications" className="animated-section interactive-card">
        <h2 style={{ ...headingStyle, color: '#f59e0b' }}>😟 Mood Distress Notifications</h2>
        {moodAlerts.length === 0 ? (
          <p style={emptyStyle}>No mood distress notifications.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {moodAlerts.map((item) => (
              <li key={item.id} style={listItemStyle} onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                <strong style={{ color: '#f1f5f9' }}>{item.data.patientId}</strong> — {item.data.message ?? 'Distress reported'}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Medication Compliance Log */}
      <section style={sectionStyle} aria-label="Medication compliance log" className="animated-section interactive-card">
        <h2 style={{...headingStyle, color: '#f1f5f9'}}>💊 Medication Compliance</h2>
        <MedicationComplianceLog events={[]} />
      </section>
    </div>
  )
}

export default StaffDashboard
