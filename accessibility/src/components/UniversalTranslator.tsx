import { useState, useCallback, useRef } from 'react'
import { ttsEngine } from '@/services/ttsEngine'
import { SignLanguageRecognizer } from '@/components/SignLanguageRecognizer'
import type { GestureRecognitionResult } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type FailingStage = 'sign-recognition' | 'tts' | 'stt' | null

interface PipelineState {
  /** Recognized text from sign language (Stage 1 → 2) */
  signText: string
  /** Transcribed text from hearing participant speech (Stage 4) */
  hearingText: string
  /** Which pipeline stage has failed, if any */
  failingStage: FailingStage
  /** Descriptive error message for the failing stage */
  errorMessage: string | null
  /** True when any stage has failed and we are in text-only mode */
  textOnlyFallback: boolean
  /** True while TTS is being triggered */
  ttsActive: boolean
  /** True while STT is listening */
  sttListening: boolean
}

// ─── Stage error messages (Req 16.4) ─────────────────────────────────────────

const STAGE_ERRORS: Record<NonNullable<FailingStage>, string> = {
  'sign-recognition':
    'Sign language recognition unavailable. Please type your message in the text box below.',
  'tts':
    'Audio output unavailable — text-only mode active. Your message is displayed on screen.',
  'stt':
    'Speech transcription unavailable. Hearing participant can type their message in the text box below.',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UniversalTranslatorProps {
  /** Optional authenticated user ID forwarded to SignLanguageRecognizer for gesture data persistence */
  userId?: string | null
}

export function UniversalTranslator({ userId = null }: UniversalTranslatorProps) {
  const [state, setState] = useState<PipelineState>({
    signText: '',
    hearingText: '',
    failingStage: null,
    errorMessage: null,
    textOnlyFallback: false,
    ttsActive: false,
    sttListening: false,
  })

  // Text-only fallback inputs
  const [signFallbackText, setSignFallbackText] = useState('')
  const [hearingFallbackText, setHearingFallbackText] = useState('')

  // Keep a ref to the active SpeechRecognition instance so we can abort it
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // ── Stage failure helper ──────────────────────────────────────────────────

  function setStageError(stage: NonNullable<FailingStage>) {
    setState((s) => ({
      ...s,
      failingStage: stage,
      errorMessage: STAGE_ERRORS[stage],
      textOnlyFallback: true,
      ttsActive: false,
      sttListening: false,
    }))
  }

  // ── Stage 1 + 2 + 3: Sign language → text → TTS ──────────────────────────
  // Called by SignLanguageRecognizer whenever a gesture is recognized (Req 16.1)

  const handleGestureResult = useCallback((result: GestureRecognitionResult) => {
    const text = result.text
    if (!text) return

    // Stage 2: display intermediate text immediately (Req 16.2)
    setState((s) => ({
      ...s,
      signText: text,
      failingStage: s.failingStage === 'sign-recognition' ? null : s.failingStage,
      errorMessage: s.failingStage === 'sign-recognition' ? null : s.errorMessage,
      textOnlyFallback: s.failingStage !== null && s.failingStage !== 'sign-recognition'
        ? s.textOnlyFallback
        : false,
      ttsActive: true,
    }))

    // Stage 3: TTS — runs simultaneously with text display (Req 16.1, 16.2)
    try {
      ttsEngine.speak(text)
      setState((s) => ({ ...s, ttsActive: false }))
    } catch {
      // Stage 3 failure → text-only fallback (Req 16.4)
      setStageError('tts')
    }
  }, [])

  // Handle sign recognition model/camera failure (Req 16.4)
  // This is triggered when the user manually types in the sign fallback input
  function handleSignFallbackSubmit() {
    const text = signFallbackText.trim()
    if (!text) return

    // Display the typed text as the sign output
    setState((s) => ({ ...s, signText: text, ttsActive: true }))

    // Still attempt TTS even in fallback mode
    try {
      ttsEngine.speak(text)
      setState((s) => ({ ...s, ttsActive: false }))
    } catch {
      setStageError('tts')
    }
  }

  // ── Stage 4: Hearing participant speech → STT → text for deaf user ────────
  // (Req 16.3)

  function handleHearingInput() {
    // If already listening, stop
    if (state.sttListening) {
      recognitionRef.current?.stop()
      setState((s) => ({ ...s, sttListening: false }))
      return
    }

    const SR =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SR) {
      // STT not supported → text-only fallback (Req 16.4)
      setStageError('stt')
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setState((s) => ({ ...s, sttListening: true, errorMessage: null }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      setState((s) => ({
        ...s,
        hearingText: transcript,
        sttListening: false,
        // Clear STT error if it was previously set
        failingStage: s.failingStage === 'stt' ? null : s.failingStage,
        errorMessage: s.failingStage === 'stt' ? null : s.errorMessage,
        textOnlyFallback: s.failingStage !== null && s.failingStage !== 'stt'
          ? s.textOnlyFallback
          : false,
      }))
    }

    recognition.onerror = () => {
      // STT failure → text-only fallback (Req 16.4)
      setStageError('stt')
    }

    recognition.onend = () => {
      setState((s) => ({ ...s, sttListening: false }))
    }

    try {
      recognition.start()
    } catch {
      setStageError('stt')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showSignFallbackInput =
    state.textOnlyFallback && state.failingStage === 'sign-recognition'
  const showHearingFallbackInput =
    state.textOnlyFallback && state.failingStage === 'stt'

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-xl font-bold">Universal Translator</h2>
        <p className="text-sm text-gray-600 mt-1">
          Sign language → text + speech (for hearing) | Speech → text (for deaf user)
        </p>
      </div>

      {/* ── Per-stage error alert (Req 16.4) ── */}
      {state.errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 border border-red-300 p-3 text-red-800 text-sm"
        >
          <span className="font-semibold">
            {state.failingStage === 'sign-recognition' && 'Sign language recognition failed: '}
            {state.failingStage === 'tts' && 'Audio output failed: '}
            {state.failingStage === 'stt' && 'Speech transcription failed: '}
          </span>
          {state.errorMessage}
          {state.textOnlyFallback && (
            <span className="block mt-1 text-xs text-red-600 font-medium">
              Text-only mode active
            </span>
          )}
        </div>
      )}

      {/* ── Deaf user section: sign language input ── */}
      <section
        aria-label="Deaf user — sign language input"
        className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3"
      >
        <h3 className="font-semibold text-sm">Your sign language → text + speech</h3>

        {/* Stage 1: SignLanguageRecognizer (Req 16.1) */}
        {/* The recognizer calls onResult whenever a gesture is detected */}
        <SignLanguageRecognizer
          onResult={handleGestureResult}
          userId={userId}
        />

        {/* Stage 2: Intermediate text display — shown simultaneously with audio (Req 16.2) */}
        {state.signText && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Recognized sign text"
            className="rounded-lg bg-white border border-blue-300 p-3"
          >
            <span className="text-xs text-gray-500 block mb-1">
              Recognized text (displayed simultaneously with audio):
            </span>
            <p className="text-blue-900 font-semibold text-lg leading-snug">{state.signText}</p>
            {state.ttsActive && (
              <span className="text-xs text-blue-600 mt-1 block" aria-live="polite">
                Speaking…
              </span>
            )}
            {state.failingStage === 'tts' && (
              <span className="text-xs text-yellow-700 mt-1 block font-medium">
                Audio unavailable — text-only mode active
              </span>
            )}
          </div>
        )}

        {/* Sign fallback text input (shown when sign recognition fails) */}
        {showSignFallbackInput && (
          <div className="flex flex-col gap-2">
            <label htmlFor="sign-fallback-input" className="text-xs text-gray-700 font-medium">
              Type your message (sign recognition unavailable):
            </label>
            <div className="flex gap-2">
              <input
                id="sign-fallback-input"
                type="text"
                value={signFallbackText}
                onChange={(e) => setSignFallbackText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignFallbackSubmit()}
                placeholder="Type your message…"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                aria-label="Text input fallback for sign language"
              />
              <button
                onClick={handleSignFallbackSubmit}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white text-sm font-medium hover:bg-blue-700"
                aria-label="Send typed message"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Hearing participant section: speech → STT → text (Req 16.3) ── */}
      <section
        aria-label="Hearing participant — speech input"
        className="rounded-lg border border-green-200 bg-green-50 p-4 flex flex-col gap-3"
      >
        <h3 className="font-semibold text-sm">Hearing participant speaks → text for you</h3>

        <button
          onClick={handleHearingInput}
          aria-pressed={state.sttListening}
          aria-label={
            state.sttListening
              ? 'Stop listening to hearing participant'
              : 'Start listening to hearing participant'
          }
          className={`rounded-lg px-4 py-2 text-white text-sm font-medium transition-colors ${
            state.sttListening
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {state.sttListening ? '⏹ Stop Listening' : '🎤 Listen to Hearing Participant'}
        </button>

        {state.sttListening && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-green-700 font-medium animate-pulse"
          >
            Listening…
          </p>
        )}

        {/* STT result: transcribed text displayed for deaf user (Req 16.3) */}
        {state.hearingText && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Hearing participant message"
            className="rounded-lg bg-white border border-green-300 p-3"
          >
            <span className="text-xs text-gray-500 block mb-1">Hearing participant said:</span>
            <p className="text-green-900 font-semibold text-lg leading-snug">{state.hearingText}</p>
          </div>
        )}

        {/* Hearing participant text fallback (shown when STT fails) */}
        {showHearingFallbackInput && (
          <div className="flex flex-col gap-2">
            <label htmlFor="hearing-fallback-input" className="text-xs text-gray-700 font-medium">
              Hearing participant — type your message (speech transcription unavailable):
            </label>
            <input
              id="hearing-fallback-input"
              type="text"
              value={hearingFallbackText}
              onChange={(e) => {
                setHearingFallbackText(e.target.value)
                setState((s) => ({ ...s, hearingText: e.target.value }))
              }}
              placeholder="Type message here…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-label="Hearing participant text input fallback"
            />
          </div>
        )}
      </section>

      {/* ── Pipeline status indicator ── */}
      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
        <span>
          Pipeline:{' '}
          <span className="font-mono">
            {state.sttListening
              ? 'stt-input'
              : state.ttsActive
              ? 'tts-output'
              : state.signText || state.hearingText
              ? 'text-display'
              : 'idle'}
          </span>
        </span>
        {state.textOnlyFallback && (
          <span className="text-yellow-600 font-medium">(text-only fallback active)</span>
        )}
      </div>
    </div>
  )
}

export default UniversalTranslator
