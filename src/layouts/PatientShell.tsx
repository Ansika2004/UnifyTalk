/**
 * PatientShell — premium dark sidebar layout, medical mode.
 */
import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import SOSModule from '../components/SOSModule'
import NoiseDetector from '../components/NoiseDetector'
import { LanguageDetector } from '../components/LanguageDetector'

const DEMO_PATIENT_ID = 'demo-patient'
const DEMO_WARD_ID = 'ward-1'

const NAV = [
  { to: '/patient/chat',          icon: '💬', label: 'Dr. AI Chat',    badge: 'AI' },
  { to: '/patient/symptoms',      icon: '🩺', label: 'Symptoms' },
  { to: '/patient/pictograms',    icon: '🖼',  label: 'Pictograms' },
  { to: '/patient/sign-language', icon: '🤟', label: 'Sign Language' },
  { to: '/patient/mental-health', icon: '🧠', label: 'Mental Health' },
  { to: '/patient/records',       icon: '📋', label: 'Records' },
  { to: '/patient/medication',    icon: '💊', label: 'Medication' },
  { to: '/patient/vitals',        icon: '❤️', label: 'Vitals' },
  { to: '/patient/calm-corner',   icon: '🌿', label: 'Calm Corner' },
  { to: '/patient/voice-profile', icon: '🎙', label: 'Voice Profile' },
  { to: '/patient/settings',      icon: '⚙️', label: 'Settings' },
]

const C = '#0ecfb0'

export default function PatientShell() {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const location = useLocation()
  const current = NAV.find(n => location.pathname.startsWith(n.to))

  return (
    <>
      <style>{`
        @keyframes sidebarGlow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .nav-item:hover { background: rgba(14,207,176,0.07) !important; color: #e2fdf8 !important; border-color: rgba(14,207,176,0.15) !important; }
        .nav-item:hover .nav-icon { transform: scale(1.15); }
        .nav-icon { transition: transform 0.2s ease; display: inline-block; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(14,207,176,0.2); border-radius: 2px; }
        @media (max-width: 768px) {
          .med-sidebar { transform: translateX(-100%) !important; transition: transform 0.28s ease !important; }
          .med-sidebar.mob-open { transform: translateX(0) !important; }
          .med-content { margin-left: 0 !important; }
          .med-overlay { display: block !important; }
          .med-hamburger { display: flex !important; }
        }
        .med-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 49; }
        .med-hamburger { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(14,207,176,0.1); border: 1px solid rgba(14,207,176,0.25); border-radius: 8px; cursor: pointer; color: #0ecfb0; font-size: 1.1rem; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#030712' }}>
        <LanguageDetector />

        {/* ── Sidebar ── */}
        <aside className={`med-sidebar${collapsed ? '' : ''}${!collapsed ? ' mob-open' : ''}`} style={{
          width: collapsed ? '68px' : '230px',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #060d1f 0%, #030712 100%)',
          borderRight: '1px solid rgba(14,207,176,0.08)',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}>
          {/* Ambient glow top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: `radial-gradient(ellipse at 50% 0%, ${C}12 0%, transparent 70%)`, pointerEvents: 'none', animation: 'sidebarGlow 4s ease-in-out infinite' }} />

          {/* Logo */}
          <div style={{ padding: '1.125rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${C}25, ${C}08)`, border: `1px solid ${C}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${C}20` }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M4 3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill={C} fillOpacity="0.95"/>
                <path d="M14 10h2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1v2l-3-2H9a3 3 0 0 1-2.6-1.5" fill={C} fillOpacity="0.35"/>
              </svg>
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C, whiteSpace: 'nowrap', lineHeight: 1.2 }}>UnifyTalk</div>
                <div style={{ fontSize: '0.62rem', color: '#334155', whiteSpace: 'nowrap', marginTop: '1px', letterSpacing: '0.04em' }}>Medical Mode</div>
              </div>
            )}
            <button onClick={() => setCollapsed(v => !v)}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', cursor: 'pointer', padding: '5px 7px', borderRadius: '6px', flexShrink: 0, fontSize: '0.75rem', lineHeight: 1, transition: 'all 0.2s' }}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1px', position: 'relative', zIndex: 1 }}>
            {NAV.map(item => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <NavLink key={item.to} to={item.to} className="nav-item"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: collapsed ? '0.7rem 0' : '0.55rem 0.75rem',
                    borderRadius: '0.5rem', textDecoration: 'none',
                    background: isActive ? `linear-gradient(90deg, ${C}18, ${C}06)` : 'transparent',
                    border: `1px solid ${isActive ? C + '35' : 'transparent'}`,
                    color: isActive ? C : '#4a5568',
                    fontSize: '0.82rem', fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active left bar */}
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '2px', background: C, borderRadius: '0 2px 2px 0', boxShadow: `0 0 8px ${C}` }} />}
                  <span className="nav-icon" style={{ fontSize: '1rem', flexShrink: 0, marginLeft: isActive ? '2px' : '0' }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.label}</span>
                      {item.badge && <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px', background: `${C}25`, border: `1px solid ${C}40`, borderRadius: '999px', color: C, letterSpacing: '0.05em' }}>{item.badge}</span>}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom */}
          <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.375rem', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            {!collapsed && (
              <div style={{ padding: '0 0.25rem 0.375rem' }}>
                <NoiseDetector />
              </div>
            )}
            <a href="/"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: collapsed ? '0.7rem 0' : '0.5rem 0.75rem', borderRadius: '0.5rem', textDecoration: 'none', color: '#334155', fontSize: '0.78rem', fontWeight: 500, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            >
              <span style={{ fontSize: '0.85rem' }}>←</span>
              {!collapsed && <span>Back to Home</span>}
            </a>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="med-content" style={{ flex: 1, marginLeft: collapsed ? '68px' : '230px', transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top bar */}
          <header style={{ height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <button className="med-hamburger" onClick={() => setCollapsed(v => !v)} aria-label="Toggle menu">☰</button>
              <span style={{ fontSize: '1.1rem' }}>{current?.icon ?? '🏥'}</span>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>{current?.label ?? 'Medical'}</div>
                <div style={{ fontSize: '0.65rem', color: '#334155', letterSpacing: '0.04em' }}>UnifyTalk Medical</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C, boxShadow: `0 0 8px ${C}` }} />
              <span style={{ fontSize: '0.72rem', color: C, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Medical Mode</span>
            </div>
          </header>

          {/* Page */}
          <main id="main-content" style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', color: '#f1f5f9' }}>
            <Outlet />
          </main>
        </div>

        <SOSModule patientId={DEMO_PATIENT_ID} wardId={DEMO_WARD_ID} />
      </div>
    </>
  )
}
