// Requirements: 4.1, 4.2, 4.3, 4.4
import { useState, useEffect, useRef } from 'react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { ttsEngine, syncTTSPreferences } from '@/services/ttsEngine'

const QUICK_PHRASES = [
  'Hello',
  'Excuse me',
  'I need help',
  'Where is the bathroom?',
  'Thank you',
  'Yes',
  'No',
  'Please',
  'I am in pain',
  'Call a doctor',
  'I need water',
  'I am hungry',
  'I am cold',
  'I am hot',
  'I need medicine',
  'I cannot breathe',
  'Call my family',
  'I am lost',
  'I need the toilet',
  'Good morning',
]

export function TTSPanel() {
  const { preferences, setPreferences } = useAccessibility()
  syncTTSPreferences(preferences.ttsEnabled, preferences.audioSpeed)

  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const [rate, setRate] = useState(preferences.audioSpeed)
  const [volumeBoost, setVolumeBoost] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    function loadVoices() {
      const v = ttsEngine.getVoices()
      if (v.length > 0) setVoices(v)
    }
    loadVoices()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  // Sync rate back to preferences when changed
  useEffect(() => {
    setPreferences({ audioSpeed: rate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate])

  const filteredVoices = voices.filter((v) => {
    if (genderFilter === 'all') return true
    const name = v.name.toLowerCase()
    if (genderFilter === 'male') return name.includes('male') || name.includes('man')
    if (genderFilter === 'female') return name.includes('female') || name.includes('woman')
    return true
  })

  const handleSpeak = () => {
    if (!text.trim()) return
    setError('')
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
      if (!synth) throw new Error('Speech synthesis not available')
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = rate
      utterance.volume = volumeBoost ? 1.0 : 0.8
      if (selectedVoiceURI) {
        const voice = voices.find((v) => v.voiceURI === selectedVoiceURI)
        if (voice) utterance.voice = voice
      }
      utterance.onerror = () => {
        // Requirement 4.4: retain text, show error
        setError('Speech failed. Please check your audio settings and try again.')
      }
      synth.speak(utterance)
    } catch {
      // Requirement 4.4: retain text, show error
      setError('Speech synthesis is not available on this device.')
    }
  }

  const handleStop = () => {
    ttsEngine.cancel()
    setError('')
  }

  const handleQuickPhrase = (phrase: string) => {
    setText((prev) => (prev ? `${prev} ${phrase}` : phrase))
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Type-to-Speak */}
      <section aria-labelledby="tts-heading">
        <h2 id="tts-heading" className="text-lg font-semibold mb-2">Type to Speak</h2>
        <label htmlFor="tts-textarea" className="sr-only">Type text to speak</label>
        <textarea
          id="tts-textarea"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Type something to speak…"
          className="w-full rounded-lg border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          aria-label="Type text to speak"
        />
        {/* Requirement 4.4: error retains text */}
        {error && (
          <div role="alert" className="mt-2 rounded bg-red-50 border border-red-300 p-2 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSpeak}
            disabled={!text.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
            aria-label="Speak typed text"
          >
            Speak
          </button>
          <button
            onClick={handleStop}
            className="rounded-lg bg-gray-200 px-4 py-2 font-medium hover:bg-gray-300"
            aria-label="Stop speaking"
          >
            Stop
          </button>
        </div>
      </section>

      {/* Voice settings */}
      <section aria-labelledby="voice-settings-heading">
        <h2 id="voice-settings-heading" className="text-lg font-semibold mb-3">Voice Settings</h2>
        <div className="flex flex-col gap-3">
          {/* Gender filter */}
          <div>
            <label htmlFor="gender-filter" className="block text-sm font-medium mb-1">Voice gender</label>
            <select
              id="gender-filter"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          {/* Voice selector */}
          {filteredVoices.length > 0 && (
            <div>
              <label htmlFor="voice-select" className="block text-sm font-medium mb-1">Voice</label>
              <select
                id="voice-select"
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">Default</option>
                {filteredVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Speech rate */}
          <div>
            <label htmlFor="speech-rate" className="block text-sm font-medium mb-1">
              Speech rate: {rate.toFixed(1)}×
            </label>
            <input
              id="speech-rate"
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full"
              aria-label={`Speech rate ${rate.toFixed(1)}`}
              aria-valuemin={0.5}
              aria-valuemax={2.0}
              aria-valuenow={rate}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.5×</span><span>2.0×</span>
            </div>
          </div>

          {/* Volume boost */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={volumeBoost}
              onChange={(e) => setVolumeBoost(e.target.checked)}
              aria-label="Volume boost"
            />
            Volume boost
          </label>
        </div>
      </section>

      {/* Quick Speak */}
      <section aria-labelledby="quick-speak-heading">
        <h2 id="quick-speak-heading" className="text-lg font-semibold mb-2">Quick Speak</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              onClick={() => handleQuickPhrase(phrase)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-left hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Insert phrase: ${phrase}`}
            >
              {phrase}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
