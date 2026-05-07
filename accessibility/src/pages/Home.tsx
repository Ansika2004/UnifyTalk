import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { to: '/pictograms', icon: '🖼', label: 'Pictogram Board', desc: 'Tap symbols to communicate' },
  { to: '/tts', icon: '🔊', label: 'Text to Speech', desc: 'Type and speak aloud' },
  { to: '/sign-language', icon: '🤟', label: 'Sign Language', desc: 'Camera-based sign recognition' },
  { to: '/captions', icon: '📝', label: 'Live Captions', desc: 'Real-time speech transcription' },
  { to: '/chat', icon: '💬', label: 'Accessible Chat', desc: 'Multilingual real-time messaging' },
  { to: '/community', icon: '👥', label: 'Community', desc: 'Connect with others' },
  { to: '/settings', icon: '⚙️', label: 'Settings', desc: 'Accessibility preferences' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <main id="main-content" className="p-4 max-w-2xl mx-auto pb-20">
      <header className="mb-6">
        <h1
          className="font-bold"
          style={{ fontSize: 'calc(var(--font-size-base) * 1.5)', color: 'var(--color-text)' }}
        >
          UnifyTalk Accessibility
        </h1>
        <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text)', opacity: 0.7 }}>
          Communication tools for everyone
        </p>
      </header>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Features</h2>
        <ul
          className="grid grid-cols-2 gap-3 list-none p-0 m-0"
          aria-label="Feature tiles"
        >
          {FEATURES.map((f) => (
            <li key={f.to}>
              <button
                onClick={() => navigate(f.to)}
                aria-label={`${f.label}: ${f.desc}`}
                className="flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all hover:scale-105 active:scale-95 w-full"
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  background: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <span aria-hidden="true" className="text-3xl mb-2">{f.icon}</span>
                <span className="font-semibold" style={{ fontSize: 'var(--font-size-base)' }}>
                  {f.label}
                </span>
                <span className="text-sm opacity-70 mt-1">{f.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
