import { useState, useEffect, useRef, useCallback } from 'react'

const MAX_HISTORY = 50

type STTProvider = 'web-speech' | 'google-stt'

interface CaptionEntry {
  id: number
  text: string
  timestamp: number
  isFinal: boolean
}

// Extend window for SpeechRecognition cross-browser
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

interface TranscriptionError {
  message: string
  suggestions: string[]
}

function buildTranscriptionError(errorCode: string): TranscriptionError {
  switch (errorCode) {
    case 'not-allowed':
      return {
        message: 'Microphone permission was denied.',
        suggestions: [
          'Check that your microphone is connected and permissions are granted.',
          'Open your browser settings and allow microphone access for this site.',
          'Try refreshing the page if the issue persists.',
        ],
      }
    case 'no-speech':
      return {
        message: 'No speech was detected.',
        suggestions: [
          'Ensure you are speaking clearly into your microphone.',
          'Check that your microphone is not muted.',
          'Ensure you have selected a supported language.',
        ],
      }
    case 'network':
      return {
        message: 'A network error occurred during transcription.',
        suggestions: [
          'Check your internet connection and try again.',
          'Try refreshing the page if the issue persists.',
        ],
      }
    case 'language-not-supported':
      return {
        message: 'The selected language is not supported.',
        suggestions: [
          'Ensure you have selected a supported language.',
          'Try switching to a different language and restart captions.',
        ],
      }
    default:
      return {
        message: `Transcription failed (${errorCode}).`,
        suggestions: [
          'Check that your microphone is connected and permissions are granted.',
          'Ensure you have selected a supported language.',
          'Try refreshing the page if the issue persists.',
        ],
      }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveCaptions() {
  const [captions, setCaptions] = useState<CaptionEntry[]>([])
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<TranscriptionError | null>(null)
  const [provider, setProvider] = useState<STTProvider>('web-speech')
  const [language, setLanguage] = useState('en-US')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const counterRef = useRef(0)
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // ── Stop ──────────────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  // ── Start (Web Speech API) ────────────────────────────────────────────────

  const startWebSpeech = useCallback(() => {
    setError(null)
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      setError({
        message: 'Speech recognition is not supported in this browser.',
        suggestions: [
          'Try using Google Chrome or Microsoft Edge.',
          'Alternatively, switch to Google STT provider and configure an API key.',
          'Try refreshing the page if the issue persists.',
        ],
      })
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) {
            setCaptions((prev) => {
              const entry: CaptionEntry = {
                id: ++counterRef.current,
                text,
                timestamp: Date.now(),
                isFinal: true,
              }
              const updated = [...prev, entry]
              return updated.slice(-MAX_HISTORY)
            })
          }
        } else {
          interimText += result[0].transcript
        }
      }
      setInterim(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(buildTranscriptionError(event.error))
      setListening(false)
      setInterim('')
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognition.start()
    setListening(true)
  }, [language])

  // ── Start (Google STT stub) ───────────────────────────────────────────────

  const startGoogleSTT = useCallback(() => {
    setError({
      message: 'Google STT requires API key configuration.',
      suggestions: [
        'Set the VITE_GOOGLE_STT_KEY environment variable with your Google Cloud Speech-to-Text API key.',
        'Restart the development server after adding the key.',
        'Alternatively, switch back to Web Speech API provider.',
      ],
    })
  }, [])

  // ── Unified start ─────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (provider === 'google-stt') {
      startGoogleSTT()
    } else {
      startWebSpeech()
    }
  }, [provider, startWebSpeech, startGoogleSTT])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────

  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.scrollTop = liveRegionRef.current.scrollHeight
    }
  }, [captions, interim])

  // ── Export as .txt ────────────────────────────────────────────────────────

  function exportAsTxt() {
    const content = captions
      .map((c) => {
        const time = new Date(c.timestamp).toLocaleTimeString()
        return `[${time}] ${c.text}`
      })
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `captions-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">Live Captions</h2>

      {/* Provider toggle */}
      <div className="flex flex-col gap-1">
        <label htmlFor="stt-provider" className="text-sm font-medium text-gray-700">
          Transcription Provider
        </label>
        <select
          id="stt-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as STTProvider)
            if (listening) stopListening()
            setError(null)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select transcription provider"
        >
          <option value="web-speech">Web Speech API</option>
          <option value="google-stt">Google STT (requires API key)</option>
        </select>
      </div>

      {/* Language selector */}
      <div className="flex flex-col gap-1">
        <label htmlFor="caption-language" className="text-sm font-medium text-gray-700">
          Language
        </label>
        <select
          id="caption-language"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value)
            if (listening) stopListening()
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select transcription language"
          disabled={provider === 'google-stt'}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="hi-IN">Hindi</option>
          <option value="zh-CN">Chinese (Simplified)</option>
          <option value="ja-JP">Japanese</option>
          <option value="ar-SA">Arabic</option>
          <option value="pt-BR">Portuguese (Brazil)</option>
        </select>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {!listening ? (
          <button
            onClick={startListening}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Start live captions"
          >
            Start Captions
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Stop live captions"
          >
            Stop Captions
          </button>
        )}
        <button
          onClick={exportAsTxt}
          disabled={captions.length === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Download captions as text file"
        >
          Download Captions
        </button>
        <button
          onClick={() => setCaptions([])}
          disabled={captions.length === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Clear caption history"
        >
          Clear
        </button>
      </div>

      {/* Error with corrective suggestions (Req 3.4 / Task 3.3.6) */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 border border-red-300 p-4 text-red-800"
        >
          <p className="font-semibold text-base mb-2">{error.message}</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {error.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Listening indicator */}
      {listening && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-green-700 font-medium flex items-center gap-2"
        >
          <span
            className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"
            aria-hidden="true"
          />
          Listening…
        </p>
      )}

      {/* ARIA live region — captions display (Task 3.3.3 & 3.3.4) */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-label="Live captions"
        aria-relevant="additions"
        role="log"
        className="rounded-lg border border-gray-200 bg-white p-3 min-h-[200px] max-h-[400px] overflow-y-auto flex flex-col gap-1"
        style={{ fontSize: '16px' }}
      >
        {captions.length === 0 && !interim && (
          <p className="text-gray-400 text-base">Captions will appear here…</p>
        )}

        {/* Scroll-back history — last 50 final captions */}
        {captions.map((c) => (
          <p
            key={c.id}
            className="text-base text-gray-900 leading-relaxed"
            style={{ minHeight: '1.5rem' }}
          >
            <span className="text-xs text-gray-400 mr-2 select-none" aria-hidden="true">
              {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {c.text}
          </p>
        ))}

        {/* Interim (in-progress) result — italic/gray to distinguish from final */}
        {interim && (
          <p
            className="text-gray-400 italic text-base leading-relaxed"
            aria-label={`Interim transcription: ${interim}`}
          >
            {interim}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Showing last {MAX_HISTORY} captions. {captions.length} caption
        {captions.length !== 1 ? 's' : ''} recorded.
      </p>
    </div>
  )
}

export default LiveCaptions
