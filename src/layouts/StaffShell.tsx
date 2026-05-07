/**
 * StaffShell — main layout for all staff routes.
 * Requirements: 1.2, 2.6, 4.4, 6.5, 9.6
 */
import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  marginRight: '0.75rem',
  padding: '0.375rem 0.625rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '0.95rem',
  fontWeight: isActive ? 700 : 400,
  color: isActive ? '#1d4ed8' : '#374151',
  background: isActive ? '#eff6ff' : 'transparent',
  whiteSpace: 'nowrap',
})

const StaffShell: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav
        aria-label="Staff navigation"
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.25rem',
          background: '#fff',
        }}
      >
        <NavLink
          to="/"
          style={{ marginRight: '0.5rem', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', background: '#f3f4f6', whiteSpace: 'nowrap', border: '1px solid #e5e7eb' }}
          aria-label="Back to mode selector"
        >
          ⬅ Home
        </NavLink>
        <span style={{ width: '1px', height: '1.25rem', background: '#e5e7eb', margin: '0 0.25rem' }} aria-hidden="true" />
        <NavLink to="/staff" end style={navLinkStyle}>Dashboard</NavLink>
        <NavLink to="/staff/sos-alerts" style={navLinkStyle}>SOS Alerts</NavLink>
        <NavLink to="/staff/chat" style={navLinkStyle}>Chat</NavLink>
        <NavLink to="/staff/symptom-reports" style={navLinkStyle}>Symptom Reports</NavLink>
        <NavLink to="/staff/mood-alerts" style={navLinkStyle}>Mood Alerts</NavLink>
        <NavLink to="/staff/medication-compliance" style={navLinkStyle}>Medication Compliance</NavLink>
      </nav>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}

export default StaffShell
