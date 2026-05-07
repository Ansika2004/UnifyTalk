/**
 * Doctor_Bridge — real-time two-way chat between patient and staff.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from '../firebase'
import { sendMessage } from '../services/doctorBridgeService'
import { askDrAI, type ChatTurn } from '../services/aiDoctorChat'
import { ttsEngine } from '../services/ttsEngine'
import { summarizePictograms } from '../services/aiSummarizer'
import { enqueue, dequeue } from '../services/offlineQueue'
import { useGlobalStore, selectAudioMuted } from '../store/globalStore'
import PictogramBoard from './PictogramBoard'
import SignLanguageTranslator from './SignLanguageTranslator'
import type { ChatMessage, Pictogram } from '../types'


const QUICK_REPLY_TEMPLATES = [
  "I'll be there shortly",
  'Please press the call button',
  'Your medication is on the way',
  'The doctor has been notified',
  'Try to rest',
  "I'll check on you soon",
  'Your test results are being reviewed',
  'Please stay calm',
  'A nurse will assist you',
  'Your family has been notified',
]

export interface DoctorBridgeProps {
  channelId: string
  currentUserId: string
  senderRole: 'patient' | 'staff'
  assignedStaffName?: string
  assignedStaffRole?: string
}

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 13,
    background: active ? '#1d4ed8' : '#f1f5f9',
    color: active ? '#fff' : '#374151',
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  }
}

export const DoctorBridge: React.FC<DoctorBridgeProps> = ({
  channelId,
  currentUserId,
  senderRole,
  assignedStaffName,
  assignedStaffRole,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showPictogramBoard, setShowPictogramBoard] = useState(false)
  const [showSignLanguage, setShowSignLanguage] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  // Local messages for AI chat (no Firestore needed)
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([])
  const isAiMode = assignedStaffName === 'Dr. AI'

  const audioMuted = useGlobalStore(selectAudioMuted)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      flushOfflineQueue()
    }
    function handleOffline() { setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUserId, senderRole])

  useEffect(() => {
    const db = getDb()
    if (!db) return
    const messagesRef = collection(db, 'channels', channelId, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = snapshot.docs.map((d) => ({
          messageId: d.id,
          ...(d.data() as Omit<ChatMessage, 'messageId'>),
        }))
        setMessages(msgs)

        if (senderRole === 'patient') {
          const lastMsg = msgs[msgs.length - 1]
          if (lastMsg && lastMsg.senderRole === 'staff' && !audioMuted) {
            ttsEngine.speak(lastMsg.content)
          }
        }

        if (senderRole === 'staff') {
          snapshot.docs.forEach((d) => {
            const data = d.data() as Omit<ChatMessage, 'messageId'>
            if (data.senderRole === 'patient' && !data.readAt) {
              const msgRef = doc(getDb()!, 'channels', channelId, 'messages', d.id)
              updateDoc(msgRef, { readAt: serverTimestamp() }).catch(() => {})
            }
          })
        }
      },
      (_error) => { setIsOnline(false) },
    )

    return () => unsubscribe()
  }, [channelId, senderRole, audioMuted])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function flushOfflineQueue() {
    try {
      const queued = await dequeue()
      for (const msg of queued as Array<{ content: string; inputModality: ChatMessage['inputModality'] }>) {
        await sendMessage(channelId, currentUserId, senderRole, msg.content, msg.inputModality)
      }
    } catch { /* best-effort */ }
  }

  const handleSend = useCallback(
    async (content: string, inputModality: ChatMessage['inputModality']) => {
      if (!content.trim()) return

      // AI mode — use local state + Claude API
      if (isAiMode) {
        const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content }
        setLocalMessages((prev) => [...prev, userMsg])

        setAiTyping(true)
        // Build history from current messages + new user message
        const history: ChatTurn[] = [...localMessages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))
        const reply = await askDrAI(history.slice(0, -1), content)
        setLocalMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant' as const, content: reply },
        ])
        setAiTyping(false)
        if (!audioMuted) ttsEngine.speak(reply)
        return
      }

      // Firestore mode
      if (!isOnline) {
        await enqueue({ content, inputModality })
        return
      }
      try {
        await sendMessage(channelId, currentUserId, senderRole, content, inputModality)
      } catch {
        await enqueue({ content, inputModality })
        setIsOnline(false)
      }
    },
    [channelId, currentUserId, senderRole, isOnline, isAiMode, audioMuted, localMessages],
  )

  function handleTextSend() {
    if (!textInput.trim() || aiTyping) return
    handleSend(textInput.trim(), 'text')
    setTextInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleTextSend()
  }

  async function handlePictogramSend(symbols: Pictogram[]) {
    setShowPictogramBoard(false)
    const sentence = await summarizePictograms(symbols)
    await handleSend(sentence, 'pictogram')
  }

  async function handleSignLanguageSend(phrase: string) {
    setShowSignLanguage(false)
    await handleSend(phrase, 'sign_language')
  }

  function startVoiceInput() {
    type SpeechRecognitionCtor = new () => any
    const SpeechRecognitionAPI: SpeechRecognitionCtor | undefined =
      (window as unknown as Record<string, unknown>)['SpeechRecognition'] as SpeechRecognitionCtor |
      undefined ??
      (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] as SpeechRecognitionCtor |
      undefined

    if (!SpeechRecognitionAPI) {
      setTextInput((prev) => prev + '[Voice input unavailable]')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setTextInput((prev) => prev + transcript)
      setIsListening(false)
    }
    recognition.onerror = () => { setIsListening(false) }
    recognition.onend = () => { setIsListening(false) }

    recognition.start()
    setIsListening(true)
  }

  return (
    <div
      role="region"
      aria-label="Doctor Bridge Chat"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 16px', background: isAiMode ? 'linear-gradient(135deg, #0ecfb0, #0a9e88)' : '#1d4ed8', color: '#fff', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAiMode && <span style={{ fontSize: '1.5rem' }}>🤖</span>}
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{assignedStaffName ?? 'Doctor Bridge'}</div>
          {assignedStaffRole && <div style={{ fontSize: 13, opacity: 0.85 }}>{assignedStaffRole}</div>}
        </div>
        {isAiMode && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px' }}>Powered by Claude AI</span>}
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div
          role="alert"
          aria-live="polite"
          style={{ background: '#f59e0b', color: '#1c1917', padding: '8px 16px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}
        >
          You are offline — messages will be sent when reconnected
        </div>
      )}

      {/* Messages */}
      <div
        aria-label="Chat messages"
        aria-live="polite"
        style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#0d1117' }}
      >
        {isAiMode ? (
          <>
            {localMessages.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 32 }}>
                👋 Say hello to Dr. AI — your AI medical assistant.
              </p>
            )}
            {localMessages.map((msg) => (
              <div key={msg.id} className="chat-bubble" style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(30,41,59,0.95)',
                color: '#f1f5f9',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(37,99,235,0.3)' : '0 4px 12px rgba(0,0,0,0.2)',
                fontSize: 15,
                border: msg.role === 'assistant' ? '1px solid rgba(14,207,176,0.3)' : 'none',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: 11, color: '#0ecfb0', fontWeight: 700, marginBottom: 4 }}>🤖 Dr. AI</div>
                )}
                {msg.content}
              </div>
            ))}
            {aiTyping && (
              <div style={{
                alignSelf: 'flex-start', background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 14px', borderRadius: '12px 12px 12px 2px',
                fontSize: 15, color: '#94a3b8',
              }}>
                <div style={{ fontSize: 11, color: '#0ecfb0', fontWeight: 700, marginBottom: 4 }}>🤖 Dr. AI</div>
                <span>Thinking…</span>
              </div>
            )}
          </>
        ) : (
          <>
            {messages.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 32 }}>No messages yet.</p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId
              return (
                <div key={msg.messageId} className="chat-bubble" style={{
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: isOwn ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(30,41,59,0.95)',
                  color: '#f1f5f9',
                  padding: '10px 14px',
                  borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  boxShadow: isOwn ? '0 4px 12px rgba(37,99,235,0.3)' : '0 4px 12px rgba(0,0,0,0.2)',
                  fontSize: 15,
                  border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div>{msg.content}</div>
                  {isOwn && (
                    <div aria-label={msg.readAt ? 'Read' : 'Delivered'} style={{ fontSize: 11, textAlign: 'right', marginTop: 4, opacity: 0.75 }}>
                      {msg.readAt ? '✓✓' : '✓'}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Staff quick-reply templates */}
      {senderRole === 'staff' && (
        <div
          aria-label="Quick reply templates"
          style={{ padding: '8px 12px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 6, overflowX: 'auto' }}
        >
          {QUICK_REPLY_TEMPLATES.map((template) => (
            <button
              key={template}
              onClick={() => handleSend(template, 'text')}
              style={{ padding: '6px 12px', fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, color: '#94a3b8' }}
            >
              {template}
            </button>
          ))}
        </div>
      )}

      {/* Pictogram board panel */}
      {showPictogramBoard && (
        <div style={{ height: 360, borderTop: '2px solid #0ecfb0', background: '#0d1117', overflow: 'hidden' }}>
          <PictogramBoard onSend={handlePictogramSend} />
        </div>
      )}

      {/* Sign language panel */}
      {showSignLanguage && (
        <div style={{ height: 360, borderTop: '2px solid #0ecfb0', background: '#0d1117', overflow: 'hidden' }}>
          <SignLanguageTranslator
            onPhraseReady={handleSignLanguageSend}
            onFallbackRequested={() => { setShowSignLanguage(false); setShowPictogramBoard(true) }}
          />
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '10px 12px', background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {senderRole === 'patient' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={startVoiceInput} aria-label={isListening ? 'Listening…' : 'Voice input'} aria-pressed={isListening} style={toggleBtnStyle(isListening)}>
              {isListening ? '🎙 Listening…' : '🎙 Voice'}
            </button>
            <button
              onClick={() => { setShowPictogramBoard((v) => !v); setShowSignLanguage(false) }}
              aria-label="Toggle pictogram board"
              aria-pressed={showPictogramBoard}
              style={toggleBtnStyle(showPictogramBoard)}
            >
              🖼 Pictograms
            </button>
            <button
              onClick={() => { setShowSignLanguage((v) => !v); setShowPictogramBoard(false) }}
              aria-label="Toggle sign language input"
              aria-pressed={showSignLanguage}
              style={toggleBtnStyle(showSignLanguage)}
            >
              🤟 Sign Language
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            aria-label="Type a message"
            style={{ flex: 1, padding: '10px 12px', fontSize: 15, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, outline: 'none', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9' }}
          />
          <button
            onClick={handleTextSend}
            disabled={!textInput.trim() || aiTyping}
            aria-label="Send message"
            className={textInput.trim() && !aiTyping ? "glowing-button" : ""}
            style={{
              padding: '10px 20px',
              fontSize: 15,
              fontWeight: 600,
              background: textInput.trim() && !aiTyping ? '#1d4ed8' : 'rgba(255,255,255,0.1)',
              color: textInput.trim() && !aiTyping ? '#fff' : '#64748b',
              border: 'none',
              borderRadius: 8,
              cursor: textInput.trim() && !aiTyping ? 'pointer' : 'not-allowed',
            }}
          >
            {aiTyping ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DoctorBridge
