import { useState, useRef, useEffect, useCallback } from 'react'
import { sendChatMessage, type ChatMessage } from '@/services/claudeService'
import { aacPictograms } from '@/data/aacPictograms'
import type { Pictogram } from '@/types'

/**
 * Persistent AI Assistant floating button + chat panel.
 *
 * Requirements covered:
 *   18.1 — Accessible from any page via persistent, clearly labeled entry point
 *   18.2 — Responds within 3 seconds (AbortController timeout in claudeService)
 *   18.3 — Supports text input, voice input (STT), and AAC_Board input
 *   18.4 — Compatible with screen readers and keyboard-only navigation
 *   18.5 — Graceful fallback when Claude cannot fulfill request
 */

type InputMode = 'text' | 'voice' | 'aac'

interface Message extends ChatMessage {
  id: string
  isError?: boolean
}

// ── Focusable elements inside the dialog ─────────────────────────────────────
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function AIAssistantButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showAACPicker, setShowAACPicker] = useState(false)
  const [aacCategory, setAACCategory] = useState<string>('greetings')

  const dialogRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // ── Focus trap ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        setOpen(false)
        openButtonRef.current?.focus()
        return
      }

      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled'),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [open],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMsg])
      setInputText('')
      setIsLoading(true)

      const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }))
      const { text: reply, isError } = await sendChatMessage(history, trimmed)

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        isError,
      }

      setMessages((prev) => [...prev, assistantMsg])
      setIsLoading(false)
    },
    [isLoading, messages],
  )

  // ── Voice input (STT) ───────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as unknown as Record<string, unknown>)['SpeechRecognition'] as
        | (new () => SpeechRecognition)
        | undefined ??
      (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] as
        | (new () => SpeechRecognition)
        | undefined

    if (!SpeechRecognitionAPI) {
      setInputText('Voice input is not supported in this browser.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: Event) => {
      const e = event as unknown as { results: SpeechRecognitionResultList }
      const transcript = Array.from(e.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('')
      setInputText(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  // ── AAC pictogram selection ─────────────────────────────────────────────────
  const handleAACSelect = useCallback(
    (pictogram: Pictogram) => {
      sendMessage(pictogram.phrase)
      setShowAACPicker(false)
    },
    [sendMessage],
  )

  const categories = [...new Set(aacPictograms.map((p) => p.category))]
  const filteredPictograms = aacPictograms.filter((p) => p.category === aacCategory)

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        ref={openButtonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI Assistant"
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          position: 'fixed',
          bottom: '5rem',
          left: '1rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9998,
          fontSize: '1.5rem',
          boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🤖
      </button>

      {/* ── Chat dialog ── */}
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="AI Assistant"
          aria-modal="true"
          style={{
            position: 'fixed',
            bottom: '8rem',
            left: '1rem',
            width: 'min(340px, calc(100vw - 2rem))',
            maxHeight: '70vh',
            background: 'var(--color-bg, #fff)',
            border: '2px solid #7c3aed',
            borderRadius: '0.75rem',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: '#7c3aed',
              color: '#fff',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>🤖 AI Assistant</span>
            <button
              onClick={() => {
                setOpen(false)
                openButtonRef.current?.focus()
              }}
              aria-label="Close AI Assistant"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.2rem',
                lineHeight: 1,
                padding: '0.25rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Message history */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation history"
            aria-atomic="false"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {messages.length === 0 && (
              <p
                style={{
                  color: 'var(--color-text-muted, #666)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  margin: '1rem 0',
                }}
              >
                Ask me anything, or use voice / AAC input below.
              </p>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  background: msg.role === 'user'
                    ? '#7c3aed'
                    : msg.isError
                    ? '#fef2f2'
                    : 'var(--color-surface, #f3f4f6)',
                  color: msg.role === 'user' ? '#fff' : msg.isError ? '#991b1b' : 'var(--color-text, #111)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  border: msg.isError ? '1px solid #fca5a5' : 'none',
                }}
              >
                <span className="sr-only">{msg.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                {msg.content}
              </div>
            ))}

            {isLoading && (
              <div
                aria-live="polite"
                aria-label="AI assistant is thinking"
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '1rem 1rem 1rem 0.25rem',
                  background: 'var(--color-surface, #f3f4f6)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted, #666)',
                }}
              >
                ⏳ Thinking…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* AAC Picker */}
          {showAACPicker && (
            <div
              role="region"
              aria-label="AAC pictogram picker"
              style={{
                borderTop: '1px solid #e5e7eb',
                padding: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {/* Category tabs */}
              <div
                role="tablist"
                aria-label="Pictogram categories"
                style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={aacCategory === cat}
                    onClick={() => setAACCategory(cat)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      borderRadius: '0.25rem',
                      border: '1px solid #7c3aed',
                      background: aacCategory === cat ? '#7c3aed' : 'transparent',
                      color: aacCategory === cat ? '#fff' : '#7c3aed',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Pictogram grid */}
              <div
                role="tabpanel"
                aria-label={`${aacCategory} pictograms`}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}
              >
                {filteredPictograms.map((p) => (
                  <button
                    key={p.id}
                    aria-label={p.ariaLabel}
                    title={p.label}
                    onClick={() => handleAACSelect(p)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0.25rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      minWidth: '44px',
                      minHeight: '44px',
                    }}
                  >
                    <span aria-hidden="true">{p.svgPath}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--color-text, #111)', lineHeight: 1.2 }}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input mode tabs */}
          <div
            role="tablist"
            aria-label="Input mode"
            style={{
              display: 'flex',
              borderTop: '1px solid #e5e7eb',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {(['text', 'voice', 'aac'] as InputMode[]).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={inputMode === mode}
                onClick={() => {
                  setInputMode(mode)
                  if (mode === 'aac') setShowAACPicker((v) => !v)
                  else setShowAACPicker(false)
                }}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: inputMode === mode ? '#ede9fe' : 'transparent',
                  color: inputMode === mode ? '#7c3aed' : 'var(--color-text-muted, #666)',
                  cursor: 'pointer',
                  fontWeight: inputMode === mode ? 600 : 400,
                }}
              >
                {mode === 'text' ? '⌨️ Text' : mode === 'voice' ? '🎤 Voice' : '🖼️ AAC'}
              </button>
            ))}
          </div>

          {/* Text / voice input row */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.5rem',
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(inputText)
                }
              }}
              placeholder={
                inputMode === 'voice'
                  ? isListening
                    ? 'Listening…'
                    : 'Press 🎤 to speak'
                  : 'Type a message…'
              }
              aria-label="Message input"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                background: 'var(--color-bg, #fff)',
                color: 'var(--color-text, #111)',
                outline: 'none',
              }}
            />

            {inputMode === 'voice' && (
              <button
                onClick={toggleVoice}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                aria-pressed={isListening}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #7c3aed',
                  background: isListening ? '#7c3aed' : 'transparent',
                  color: isListening ? '#fff' : '#7c3aed',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
            )}

            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.5 : 1,
                fontSize: '0.875rem',
                minWidth: '44px',
                minHeight: '44px',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
