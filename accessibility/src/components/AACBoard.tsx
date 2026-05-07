import { useState, useCallback, useRef, KeyboardEvent } from 'react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { aacPictograms } from '@/data/aacPictograms'
import { generateSentenceFromPictograms } from '@/services/claudeService'
import { ttsEngine, syncTTSPreferences } from '@/services/ttsEngine'
import type { Pictogram, PictogramCategory } from '@/types'

const CATEGORIES: PictogramCategory[] = [
  'greetings', 'needs', 'emotions', 'actions',
  'food', 'people', 'places', 'activities', 'emergency',
]

const CATEGORY_LABELS: Record<PictogramCategory, string> = {
  greetings:  'Greetings',
  needs:      'Needs',
  emotions:   'Emotions',
  actions:    'Actions',
  food:       'Food',
  people:     'People',
  places:     'Places',
  activities: 'Activities',
  emergency:  'Emergency',
}

export function AACBoard() {
  const { preferences } = useAccessibility()
  syncTTSPreferences(preferences.ttsEnabled, preferences.audioSpeed)

  const [activeCategory, setActiveCategory] = useState<PictogramCategory>('greetings')
  const [search, setSearch] = useState('')
  const [outputPhrase, setOutputPhrase] = useState('')
  const [composition, setComposition] = useState<Pictogram[]>([])
  const [generatedSentence, setGeneratedSentence] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const filteredPictograms = aacPictograms.filter((p) => {
    const matchesCategory = search ? true : p.category === activeCategory
    const matchesSearch = search
      ? p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.phrase.toLowerCase().includes(search.toLowerCase())
      : true
    return matchesCategory && matchesSearch
  })

  const handlePictogramTap = useCallback(
    (pictogram: Pictogram) => {
      setOutputPhrase(pictogram.phrase)
      setComposition((prev) => [...prev, pictogram])
      if (preferences.ttsEnabled) {
        ttsEngine.speak(pictogram.phrase)
      }
    },
    [preferences.ttsEnabled],
  )

  const handleClearComposition = () => {
    setComposition([])
    setGeneratedSentence('')
    setOutputPhrase('')
  }

  const handleGenerateSentence = async () => {
    if (composition.length === 0) return
    setIsGenerating(true)
    try {
      const sentence = await generateSentenceFromPictograms(composition)
      setGeneratedSentence(sentence)
      setOutputPhrase(sentence)
      if (preferences.ttsEnabled) {
        ttsEngine.speak(sentence)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      const next = (index + 1) % CATEGORIES.length
      tabRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft') {
      const prev = (index - 1 + CATEGORIES.length) % CATEGORIES.length
      tabRefs.current[prev]?.focus()
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Composition area */}
      <section aria-label="Composition area" style={{ borderRadius: '0.5rem', border: '1px solid rgba(245,166,35,0.3)', background: 'rgba(15,23,42,0.8)', padding: '0.75rem', minHeight: '80px' }}>
        <div className="flex flex-wrap gap-2 mb-2">
          {composition.map((p, i) => (
            <span key={`${p.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', padding: '0.2rem 0.5rem', fontSize: '0.85rem', color: '#f5a623' }}>
              <span aria-hidden="true">{p.svgPath}</span>
              <span>{p.label}</span>
            </span>
          ))}
          {composition.length === 0 && (
            <span style={{ color: '#475569', fontSize: '0.875rem' }}>Tap pictograms to build a message</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearComposition}
            disabled={composition.length === 0}
            style={{ borderRadius: '0.375rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.25rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer' }}
            aria-label="Clear composition"
          >
            Clear
          </button>
          <button
            onClick={handleGenerateSentence}
            disabled={composition.length === 0 || isGenerating}
            style={{ borderRadius: '0.375rem', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', padding: '0.25rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', opacity: composition.length === 0 || isGenerating ? 0.4 : 1 }}
            aria-label="Generate sentence from selected pictograms"
          >
            {isGenerating ? 'Generating…' : 'Generate sentence'}
          </button>
        </div>
      </section>

      {/* Output area */}
      {outputPhrase && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Selected phrase output"
          style={{ borderRadius: '0.5rem', border: '1px solid rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.08)', padding: '0.75rem', color: '#f5a623', fontWeight: 600 }}
        >
          {generatedSentence || outputPhrase}
        </div>
      )}

      {/* Search */}
      <div>
        <label htmlFor="pictogram-search" className="sr-only">Search pictograms</label>
        <input
          id="pictogram-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pictograms…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search pictograms"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div
          role="tablist"
          aria-label="Pictogram categories"
          className="flex flex-wrap gap-1"
        >
          {CATEGORIES.map((cat, index) => (
            <button
              key={cat}
              ref={(el) => { tabRefs.current[index] = el }}
              role="tab"
              aria-selected={activeCategory === cat}
              aria-controls={`panel-${cat}`}
              id={`tab-${cat}`}
              onClick={() => setActiveCategory(cat)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              style={{
                borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 500,
                border: `1px solid ${activeCategory === cat ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: activeCategory === cat ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                color: activeCategory === cat ? '#f5a623' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Pictogram grid */}
      <div
        id={`panel-${activeCategory}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeCategory}`}
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
      >
        {filteredPictograms.map((pictogram) => (
          <button
            key={pictogram.id}
            onClick={() => handlePictogramTap(pictogram)}
            aria-label={pictogram.ariaLabel}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
              borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(15,23,42,0.7)', padding: '0.75rem',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: '2.5rem', lineHeight: 1, minWidth: 48, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {pictogram.svgPath}
            </span>
            <span style={{ fontSize: '0.72rem', textAlign: 'center', color: '#94a3b8', lineHeight: 1.3 }}>{pictogram.label}</span>
          </button>
        ))}
        {filteredPictograms.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-8">No pictograms found</p>
        )}
      </div>
    </div>
  )
}
