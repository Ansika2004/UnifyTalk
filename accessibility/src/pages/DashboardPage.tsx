import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccessibility } from '@/hooks/useAccessibility'

interface FeatureTile {
  id: string
  to: string
  icon: string
  label: string
  description: string
  ariaLabel: string
}

const FEATURE_TILES: FeatureTile[] = [
  {
    id: 'pictogram',
    to: '/pictogram',
    icon: '🖼️',
    label: 'Pictogram Board',
    description: 'Communicate with picture symbols',
    ariaLabel: 'Open Pictogram Board',
  },
  {
    id: 'tts',
    to: '/tts',
    icon: '🔊',
    label: 'Text-to-Speech',
    description: 'Type and speak your message',
    ariaLabel: 'Open Text-to-Speech',
  },
  {
    id: 'sign-language',
    to: '/sign-language',
    icon: '🤟',
    label: 'Sign Language',
    description: 'Recognize sign language via camera',
    ariaLabel: 'Open Sign Language',
  },
  {
    id: 'captions',
    to: '/captions',
    icon: '📝',
    label: 'Live Captions',
    description: 'Real-time speech transcription',
    ariaLabel: 'Open Live Captions',
  },
  {
    id: 'chat',
    to: '/chat',
    icon: '✉️',
    label: 'Chat',
    description: 'Accessible real-time messaging',
    ariaLabel: 'Open Chat',
  },
  {
    id: 'community',
    to: '/community',
    icon: '👥',
    label: 'Community',
    description: 'Connect with others',
    ariaLabel: 'Open Community',
  },
  {
    id: 'progress',
    to: '/progress',
    icon: '📊',
    label: 'Progress',
    description: 'Track your learning journey',
    ariaLabel: 'Open Progress Tracker',
  },
  {
    id: 'settings',
    to: '/settings',
    icon: '⚙️',
    label: 'Settings',
    description: 'Customize your experience',
    ariaLabel: 'Open Settings',
  },
]

const RECENT_KEY = 'a11y_recent_features'
const MAX_RECENT = 3

function loadRecentFeatures(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function DashboardPage() {
  const { preferences } = useAccessibility()
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    setRecentIds(loadRecentFeatures())
  }, [])

  function handleTileClick(id: string) {
    const updated = [id, ...recentIds.filter((r) => r !== id)].slice(0, MAX_RECENT)
    setRecentIds(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  }

  const recentTiles = recentIds
    .map((id) => FEATURE_TILES.find((t) => t.id === id))
    .filter(Boolean) as FeatureTile[]

  return (
    <main id="main-content" className="min-h-screen pb-20 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">UnifyTalk</h1>
        <Link
          to="/settings"
          aria-label="Open accessibility settings"
          className="p-2 rounded-xl hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl"
        >
          <span aria-hidden="true">⚙️</span>
        </Link>
      </header>

      {/* Default notification */}
      {preferences.fontSize === 'medium' && (
        <p className="sr-only" aria-live="polite">
          Using default accessibility settings. Visit Settings to customize.
        </p>
      )}

      {/* Quick access panel */}
      {recentTiles.length > 0 && (
        <section aria-labelledby="recent-heading" className="mb-6">
          <h2 id="recent-heading" className="text-lg font-semibold mb-3">
            Recently used
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentTiles.map((tile) => (
              <Link
                key={tile.id}
                to={tile.to}
                aria-label={tile.ariaLabel}
                onClick={() => handleTileClick(tile.id)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 border border-blue-200 min-w-[80px] min-h-[44px] hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl" aria-hidden="true">{tile.icon}</span>
                <span className="text-xs font-medium text-center text-blue-800">{tile.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Feature tiles grid */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-lg font-semibold mb-3">
          All features
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {FEATURE_TILES.map((tile) => (
            <Link
              key={tile.id}
              to={tile.to}
              aria-label={tile.ariaLabel}
              onClick={() => handleTileClick(tile.id)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-2xl',
                'bg-white border-2 border-gray-100',
                'hover:border-blue-300 hover:bg-blue-50',
                'transition-colors min-h-[44px]',
                'shadow-sm',
              ].join(' ')}
            >
              <span className="text-3xl" aria-hidden="true">{tile.icon}</span>
              <span className="font-semibold text-sm text-center">{tile.label}</span>
              <span className="text-xs text-gray-500 text-center leading-tight">{tile.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
