/**
 * AppShell — premium dark sidebar layout, accessibility mode.
 */
import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { SOSButton } from '../components/SOSButton'
import AIAssistantButton from '../components/AIAssistantButton'
import { PWAInstallPrompt } from '../components/PWAInstallPrompt'
import { OfflineIndicator } from '../components/OfflineIndicator'

const NAV = [
  { to: '/',              label: 'Home',          icon: '🏠', end: true },
  { to: '/pictograms',    label: 'Pictograms',    icon: '🖼' },
  { to: '/tts',           label: 'Speak',         icon: '🔊' },
  { to: '/sign-language', label: 'Sign Language', icon: '🤟' },
  { to: '/captions',      label: 'Captions',      icon: '📝' },
  { to: '/chat',          label: 'Chat',          icon: '💬' },
  { to: '/community',     label: 'Community',     icon: '👥' },
  { to: '/progress',      label: 'Progress',      icon: '📈' },
  { to: '/buddy',         label: 'Buddy',         icon: '🤝' },
  { to: '/settings',      label: 'Settings',      icon: '⚙️' },
]

const C = '#f5a623'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const current = NAV.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/'
  ) ?? (location.pathname === '/' ? NAV[0] : undefined)

  const emergencyContacts = (() => {
    try {
      const p = localStorage.getItem('onboarding_profile')
      return p ? (JSON.parse(p).emergencyContacts ?? []) : []
    } catch { return [] }
  })()

  return (
    <>
      <style>{`
        @keyframes a11yGlow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .a11y-nav-item:hover { background: rgba(245,166,35,0.07) !important; color: #fef3e2 !important; border-color: rgba(245,166,35,0.15) !important; }
        .a11y-nav-item:hover .a11y-icon { transform: scale(1.15); }
        .a11y-icon { transition: transform 0.2s ease; display: inline-block; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(245,166,35,0.2); border-radius: 2px; }
        @media (max-width: 768px) {
          .a11y-sidebar { transform: translateX(-100%) !important; transition: transform 0.28s ease !important; }
          .a11y-sidebar.mob-open { transform: translateX(0) !important; }
          .a11y-content { margin-left: 0 !important; }
          .a11y-hamburger { display: flex !important; }
        }
        .a11y-hamburger { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25); border-radius: 8px; cursor: pointer; color: #f5a623; font-size: 1.1rem; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#030712' }}>
        {/* Skip link */}
        <a href="#main-content"
          style={{ position: 'absolute', top: '-100%', left: 0, background: C, color: '#000', padding: '0.5rem 1rem', zIndex: 9999, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}
          onFocus={e => (e.currentTarget.style.top = '0')}
          onBlur={e => (e.currentTarget.style.top = '-100%')}
        >
          Skip to main content
        </a>

        {/* ── Sidebar ── */}
        <aside className={`a11y-sidebar${!collapsed ? ' mob-open' : ''}`} style={{
          width: collapsed ? '68px' : '230px',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #0a0800 0%, #030712 100%)',
          borderRight: '1px solid rgba(245,166,35,0.08)',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: `radial-gradient(ellipse at 50% 0%, ${C}10 0%, transparent 70%)`, pointerEvents: 'none', animation: 'a11yGlow 4s ease-in-out infinite' }} />

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
                <div style={{ fontSize: '0.62rem', color: '#334155', whiteSpace: 'nowrap', marginTop: '1px', letterSpacing: '0.04em' }}>Accessibility Mode</div>
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
          <nav aria-label="Main navigation" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1px', position: 'relative', zIndex: 1 }}>
            {NAV.map(item => {
              const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className="a11y-nav-item"
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
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '2px', background: C, borderRadius: '0 2px 2px 0', boxShadow: `0 0 8px ${C}` }} />}
                  <span className="a11y-icon" style={{ fontSize: '1rem', flexShrink: 0, marginLeft: isActive ? '2px' : '0' }}>{item.icon}</span>
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom */}
          <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.375rem', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <a href="http://localhost:5173/auth?mode=medical"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: collapsed ? '0.7rem 0' : '0.5rem 0.75rem', borderRadius: '0.5rem', textDecoration: 'none', color: '#0ecfb0', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(14,207,176,0.06)', border: '1px solid rgba(14,207,176,0.18)', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.15s ease' }}
              title={collapsed ? 'Switch to Medical' : undefined}
            >
              <span>🏥</span>
              {!collapsed && <span>Medical Mode</span>}
            </a>
            <a href="http://localhost:5173"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: collapsed ? '0.7rem 0' : '0.5rem 0.75rem', borderRadius: '0.5rem', textDecoration: 'none', color: '#334155', fontSize: '0.78rem', fontWeight: 500, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#64748b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#334155' }}
              title={collapsed ? 'Home' : undefined}
            >
              <span style={{ fontSize: '0.85rem' }}>←</span>
              {!collapsed && <span>Back to Home</span>}
            </a>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="a11y-content" style={{ flex: 1, marginLeft: collapsed ? '68px' : '230px', transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top bar */}
          <header style={{ height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <button className="a11y-hamburger" onClick={() => setCollapsed(v => !v)} aria-label="Toggle menu">☰</button>
              <span style={{ fontSize: '1.1rem' }}>{current?.icon ?? '🌐'}</span>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>{current?.label ?? 'Accessibility'}</div>
                <div style={{ fontSize: '0.65rem', color: '#334155', letterSpacing: '0.04em' }}>UnifyTalk Accessibility</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C, boxShadow: `0 0 8px ${C}` }} />
              <span style={{ fontSize: '0.72rem', color: C, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Accessibility Mode</span>
            </div>
          </header>

          <OfflineIndicator />

          {/* Page */}
          <main id="main-content" style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', color: '#f1f5f9' }} tabIndex={-1}>
            <Outlet />
          </main>
        </div>

        <SOSButton hasEmergencyContacts={emergencyContacts.length > 0} emergencyContacts={emergencyContacts} userId="local-user" />
        <AIAssistantButton />
        <PWAInstallPrompt />
      </div>
    </>
  )
}
