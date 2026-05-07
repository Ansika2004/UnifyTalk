/**
 * AuthPage — unified Sign In / Sign Up page
 * Shown after mode selection, before entering the app.
 * Design: dark luxury, glassmorphism card, animated background.
 */
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@firebase/auth'
import { firebaseApp, firebaseConfigured } from '../firebase'

type Tab = 'signin' | 'signup'
type AppMode = 'medical' | 'accessibility'

const ACCENT: Record<AppMode, { color: string; dim: string; border: string; glow: string }> = {
  medical:       { color: '#0ecfb0', dim: 'rgba(14,207,176,0.12)', border: 'rgba(14,207,176,0.35)', glow: 'rgba(14,207,176,0.2)' },
  accessibility: { color: '#f5a623', dim: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.35)', glow: 'rgba(245,166,35,0.2)' },
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  label, id, type = 'text', value, onChange, placeholder, accent, autoComplete,
}: {
  label: string; id: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string; accent: string; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label htmlFor={id} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        id={id} type={type} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? accent : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '0.625rem',
          padding: '0.75rem 1rem',
          fontSize: '0.95rem',
          color: '#f1f5f9',
          outline: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: focused ? `0 0 0 3px ${accent}25` : 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ── Google button ─────────────────────────────────────────────────────────────
function GoogleBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
        padding: '0.75rem', borderRadius: '0.625rem',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.2s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = (params.get('mode') ?? 'medical') as AppMode
  const dest = params.get('dest') ?? (mode === 'medical' ? '/patient' : null)

  const a = ACCENT[mode]

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function goToApp() {
    if (mode === 'accessibility') {
      window.location.href = 'http://localhost:5174'
      return
    }
    navigate(dest ?? '/patient', { replace: true })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (tab === 'signup' && password !== confirmPw) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    // Demo mode — skip Firebase
    if (!firebaseConfigured) {
      goToApp()
      return
    }

    setLoading(true)
    try {
      const auth = getAuth(firebaseApp)
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      goToApp()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.'
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim())
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (!firebaseConfigured) { goToApp(); return }
    setLoading(true)
    setError(null)
    try {
      const auth = getAuth(firebaseApp)
      await signInWithPopup(auth, new GoogleAuthProvider())
      goToApp()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.'
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes authOrb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes authOrb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-40px)} }
        @keyframes authFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::placeholder { color: rgba(148,163,184,0.5) !important; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #0f172a inset !important; -webkit-text-fill-color: #f1f5f9 !important; }
        @media (max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-cover { display: none !important; }
        }
      `}</style>

      <div className="auth-grid" style={{
        minHeight: '100vh', display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        background: '#030712', position: 'relative', overflow: 'hidden',
      }}>
        {/* ── Animated background orbs ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', top: '-150px', left: '-100px', background: `radial-gradient(circle, ${a.color}15 0%, transparent 70%)`, animation: 'authOrb1 10s ease-in-out infinite', transition: 'background 0.8s ease' }} />
          <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', bottom: '-100px', right: '30%', background: `radial-gradient(circle, ${a.color}10 0%, transparent 70%)`, animation: 'authOrb2 12s ease-in-out infinite', transition: 'background 0.8s ease' }} />
        </div>

        {/* ── Grid lines ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* ── LEFT: Cover image + branding ── */}
        <div className="auth-cover" style={{ position: 'relative', overflow: 'hidden', zIndex: 1 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/cover.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.3) saturate(0.7)' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${a.color}20 0%, transparent 60%)`, transition: 'background 0.8s ease' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 70%, #030712 100%)' }} />

          {/* Branding content */}
          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(2rem,5vw,4rem)', animation: 'authFadeUp 0.7s ease both' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `linear-gradient(135deg, ${a.color}35, ${a.color}10)`, border: `1px solid ${a.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.8s ease' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill={a.color} fillOpacity="0.9"/>
                  <path d="M14 10h2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1v2l-3-2H9a3 3 0 0 1-2.6-1.5" fill={a.color} fillOpacity="0.4"/>
                </svg>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.color, transition: 'color 0.8s ease' }}>UnifyTalk</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Welcome back.<br />
              <span style={{ color: a.color, transition: 'color 0.8s ease' }}>
                {mode === 'medical' ? 'Medical Mode' : 'Accessibility Mode'}
              </span>
            </h1>

            <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.7, maxWidth: '360px', marginBottom: '2.5rem' }}>
              {mode === 'medical'
                ? 'Sign in to access your patient dashboard, communicate with your care team, and manage your health.'
                : 'Sign in to access your accessibility tools, AAC board, community, and personalized settings.'}
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(mode === 'medical'
                ? ['🆘 Emergency SOS', '💬 Doctor Chat', '🧠 AI Summary', '💊 Medication']
                : ['🖼 AAC Board', '🔊 TTS', '👥 Community', '🤖 AI Assistant']
              ).map(f => (
                <span key={f} style={{ padding: '0.3rem 0.75rem', background: a.dim, border: `1px solid ${a.border}`, borderRadius: '999px', color: a.color, fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.8s ease' }}>{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Auth card ── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.5rem,4vw,3rem)' }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.25rem',
            padding: 'clamp(1.5rem,4vw,2.5rem)',
            backdropFilter: 'blur(24px)',
            boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px ${a.glow}`,
            animation: 'authFadeUp 0.7s ease 0.1s both',
            transition: 'box-shadow 0.8s ease',
          }}>
            {/* Back link */}
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', color: '#475569', textDecoration: 'none', marginBottom: '1.5rem', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = a.color)}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              ← Back to home
            </a>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '0.625rem', padding: '4px', marginBottom: '1.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button key={t} type="button" onClick={() => { setTab(t); setError(null) }}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease',
                    background: tab === t ? a.color : 'transparent',
                    color: tab === t ? '#000' : '#64748b',
                    boxShadow: tab === t ? `0 2px 8px ${a.glow}` : 'none',
                  }}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.25rem' }}>
                {tab === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                {tab === 'signin' ? 'Enter your credentials to continue' : 'Fill in your details to get started'}
              </p>
            </div>

            {/* Google */}
            <GoogleBtn onClick={handleGoogle} loading={loading} />

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: '0.75rem', color: '#334155' }}>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tab === 'signup' && (
                <Field label="Full name" id="auth-name" value={name} onChange={setName} placeholder="Your name" accent={a.color} autoComplete="name" />
              )}
              <Field label="Email address" id="auth-email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" accent={a.color} autoComplete="email" />
              <Field label="Password" id="auth-password" type="password" value={password} onChange={setPassword} placeholder="••••••••" accent={a.color} autoComplete={tab === 'signin' ? 'current-password' : 'new-password'} />
              {tab === 'signup' && (
                <Field label="Confirm password" id="auth-confirm" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" accent={a.color} autoComplete="new-password" />
              )}

              {tab === 'signin' && (
                <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                  <button type="button" style={{ background: 'none', border: 'none', color: a.color, fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '0.625rem', border: 'none',
                  background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${a.color}, ${a.color}cc)`,
                  color: loading ? '#64748b' : '#000',
                  fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : `0 4px 20px ${a.glow}`,
                  transition: 'all 0.2s ease',
                  marginTop: '0.25rem',
                }}
              >
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {/* Demo skip */}
              {!firebaseConfigured && (
                <button type="button" onClick={goToApp}
                  style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Skip login (demo mode)
                </button>
              )}
            </form>

            {/* Footer */}
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#334155', marginTop: '1.5rem', marginBottom: 0 }}>
              {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError(null) }}
                style={{ background: 'none', border: 'none', color: a.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', padding: 0 }}
              >
                {tab === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
