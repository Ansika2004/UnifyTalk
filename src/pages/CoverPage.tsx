import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Mode = 'none' | 'medical' | 'accessibility'

// ── Design tokens ─────────────────────────────────────────────────────────────
const TOKENS = {
  medical: {
    accent: '#0ecfb0',
    accentDim: 'rgba(14,207,176,0.15)',
    accentBorder: 'rgba(14,207,176,0.4)',
    accentGlow: 'rgba(14,207,176,0.25)',
    accentText: '#0ecfb0',
    label: 'Medical Mode',
    emoji: '🏥',
    tagline: 'For hospital patients who cannot speak',
    features: ['🆘 Emergency SOS', '🤟 Sign Language', '🧠 AI Symptom Summary', '💊 Medication', '👁 Eye Gaze', '💬 Doctor Chat'],
  },
  accessibility: {
    accent: '#f5a623',
    accentDim: 'rgba(245,166,35,0.15)',
    accentBorder: 'rgba(245,166,35,0.4)',
    accentGlow: 'rgba(245,166,35,0.25)',
    accentText: '#f5a623',
    label: 'Accessibility Mode',
    emoji: '🌐',
    tagline: 'For differently-abled users in everyday life',
    features: ['🖼 AAC Board', '🔊 TTS Engine', '📝 Live Captions', '👥 Community', '🤖 AI Assistant', '🤟 Sign Learning'],
  },
}

// ── Animated background orbs ──────────────────────────────────────────────────
function Orbs({ accent }: { accent: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', width: '600px', height: '600px',
        borderRadius: '50%', top: '-200px', right: '-100px',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        transition: 'background 0.8s ease',
        animation: 'orbFloat1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        borderRadius: '50%', bottom: '-100px', left: '10%',
        background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)`,
        transition: 'background 0.8s ease',
        animation: 'orbFloat2 10s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        borderRadius: '50%', top: '40%', left: '40%',
        background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`,
        transition: 'background 0.8s ease',
        animation: 'orbFloat3 12s ease-in-out infinite',
      }} />
    </div>
  )
}

// ── Grid lines overlay ────────────────────────────────────────────────────────
function GridLines() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
    }} />
  )
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({
  type, active, hovered, onClick, onMouseEnter, onMouseLeave,
}: {
  type: 'medical' | 'accessibility'
  active: boolean
  hovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const t = TOKENS[type]
  const elevated = active || hovered

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Select ${t.label}`}
      aria-pressed={active}
      style={{
        flex: 1, minWidth: '240px', maxWidth: '320px',
        padding: '1.5rem',
        background: active
          ? `linear-gradient(135deg, ${t.accentDim}, rgba(255,255,255,0.03))`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? t.accent : elevated ? t.accentBorder : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '1rem',
        cursor: 'pointer',
        textAlign: 'left',
        backdropFilter: 'blur(20px)',
        transform: elevated ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: active
          ? `0 8px 40px ${t.accentGlow}, 0 0 0 1px ${t.accent}40`
          : elevated
          ? `0 8px 32px rgba(0,0,0,0.4)`
          : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Active indicator bar */}
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
        }} />
      )}

      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '0.625rem',
          background: `${t.accentDim}`,
          border: `1px solid ${t.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: active ? `0 0 16px ${t.accentGlow}` : 'none',
          transition: 'box-shadow 0.3s ease',
        }}>
          {t.emoji}
        </div>
        <div>
          <div style={{
            fontSize: '1rem', fontWeight: 700, color: active ? t.accent : '#f1f5f9',
            transition: 'color 0.3s ease', lineHeight: 1.2,
          }}>
            {t.label}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
            {type === 'medical' ? 'Hospital · Clinical' : 'Everyday · Community'}
          </div>
        </div>
      </div>

      <p style={{
        fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6,
        margin: '0 0 1rem', minHeight: '2.5rem',
      }}>
        {t.tagline}
      </p>

      {/* Feature pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {t.features.slice(0, 3).map(f => (
          <span key={f} style={{
            padding: '0.2rem 0.5rem',
            background: active ? `${t.accentDim}` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${active ? t.accentBorder : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '999px', color: active ? t.accent : '#94a3b8',
            fontSize: '0.65rem', fontWeight: 500,
            transition: 'all 0.3s ease',
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* CTA arrow */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', right: '1.25rem',
        width: '28px', height: '28px', borderRadius: '50%',
        background: active ? t.accent : 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', color: active ? '#000' : '#64748b',
        transition: 'all 0.3s ease',
        transform: elevated ? 'scale(1.1)' : 'scale(1)',
      }}>
        →
      </div>
    </button>
  )
}

// ── Main CoverPage ────────────────────────────────────────────────────────────
export default function CoverPage() {
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState<Mode>('none')
  const [hoveredMode, setHoveredMode] = useState<Mode>('none')
  const [launching, setLaunching] = useState(false)

  const displayMode = activeMode !== 'none' ? activeMode : hoveredMode !== 'none' ? hoveredMode : 'none'
  const accent = displayMode !== 'none' ? TOKENS[displayMode].accent : '#6366f1'

  function handleSelect(mode: 'medical' | 'accessibility') {
    setActiveMode(mode)
    setLaunching(true)
    setTimeout(() => {
      navigate(`/auth?mode=${mode}`)
    }, 600)
  }

  return (
    <>
      <style>{`
        @keyframes orbFloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px, 20px); } }
        @keyframes orbFloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px, -30px); } }
        @keyframes orbFloat3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px, 15px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes launchOut { to { opacity:0; transform:scale(1.05); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030712; }
      `}</style>

      <div style={{
        minHeight: '100vh', width: '100%',
        background: 'linear-gradient(135deg, #030712 0%, #0a0f1e 50%, #030712 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'stretch',
        animation: launching ? 'launchOut 0.6s ease forwards' : 'none',
      }}>
        <GridLines />
        <Orbs accent={accent} />

        {/* ── Two-column layout ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          width: '100%', minHeight: '100vh',
          gap: 0,
        }}>

          {/* ── LEFT: Content ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(2rem, 5vw, 5rem)',
            paddingRight: '2rem',
          }}>
            {/* Brand */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
              marginBottom: '2rem',
              animation: 'fadeUp 0.6s ease 0.1s both',
            }}>
              {/* SVG logo mark — two overlapping speech arcs */}
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                border: `1px solid ${accent}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.8s ease',
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"
                    fill={accent} fillOpacity="0.9"/>
                  <path d="M14 10h2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1v2l-3-2H9a3 3 0 0 1-2.6-1.5"
                    fill={accent} fillOpacity="0.4"/>
                </svg>
              </div>
              <span style={{
                fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: accent,
                transition: 'color 0.8s ease',
              }}>UnifyTalk</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 4rem)',
              fontWeight: 800, lineHeight: 1.05,
              color: '#f8fafc',
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em',
              animation: 'fadeUp 0.6s ease 0.2s both',
            }}>
              Every voice<br />
              deserves to<br />
              <span style={{ color: accent, transition: 'color 0.8s ease' }}>
                be heard.
              </span>
            </h1>

            <p style={{
              fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)',
              color: '#64748b', lineHeight: 1.7,
              maxWidth: '420px', marginBottom: '2.5rem',
              animation: 'fadeUp 0.6s ease 0.3s both',
            }}>
              An AI-powered communication platform for hospital patients and differently-abled users. Choose your mode to get started.
            </p>

            {/* Mode cards */}
            <div style={{
              display: 'flex', gap: '1rem', flexWrap: 'wrap',
              animation: 'fadeUp 0.6s ease 0.4s both',
            }}>
              <ModeCard
                type="medical"
                active={activeMode === 'medical'}
                hovered={hoveredMode === 'medical'}
                onClick={() => handleSelect('medical')}
                onMouseEnter={() => setHoveredMode('medical')}
                onMouseLeave={() => setHoveredMode('none')}
              />
              <ModeCard
                type="accessibility"
                active={activeMode === 'accessibility'}
                hovered={hoveredMode === 'accessibility'}
                onClick={() => handleSelect('accessibility')}
                onMouseEnter={() => setHoveredMode('accessibility')}
                onMouseLeave={() => setHoveredMode('none')}
              />
            </div>

            {/* Bottom tagline */}
            <div style={{
              marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
              animation: 'fadeUp 0.6s ease 0.5s both',
            }}>
              <div style={{ height: '1px', width: '40px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.75rem', color: '#334155', letterSpacing: '0.05em' }}>
                Designed for accessibility · Built with compassion
              </span>
            </div>
          </div>

          {/* ── RIGHT: Visual ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* cover.jpg full bleed */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/cover.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.35) saturate(0.8)',
              transition: 'filter 0.8s ease',
            }} />

            {/* Gradient fade on left edge to blend with left panel */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, #030712 0%, transparent 25%)',
              pointerEvents: 'none',
            }} />

            {/* Accent color tint overlay that shifts with mode */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 60% 50%, ${accent}18 0%, transparent 70%)`,
              transition: 'background 0.8s ease',
              pointerEvents: 'none',
            }} />

            {/* Vertical accent line on left edge */}
            <div style={{
              position: 'absolute', left: 0, top: '15%', bottom: '15%',
              width: '1px',
              background: `linear-gradient(to bottom, transparent, ${accent}50, transparent)`,
              transition: 'background 0.8s ease',
            }} />

            {/* Feature list — shown when a mode is active/hovered */}
            {displayMode !== 'none' && (
              <div style={{
                position: 'absolute', bottom: '2rem', right: '2rem',
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                animation: 'fadeUp 0.4s ease both',
              }}>
                {TOKENS[displayMode].features.map((f, i) => (
                  <div key={f} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.3rem 0.75rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${TOKENS[displayMode].accentBorder}`,
                    borderRadius: '999px',
                    fontSize: '0.72rem', color: '#cbd5e1',
                    backdropFilter: 'blur(8px)',
                    animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <span style={{ color: TOKENS[displayMode].accent }}>{f.split(' ')[0]}</span>
                    <span>{f.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
