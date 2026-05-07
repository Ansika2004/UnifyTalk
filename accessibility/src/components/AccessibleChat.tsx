import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { ttsEngine, syncTTSPreferences } from '@/services/ttsEngine'
import { firebaseConfigured } from '@/firebase'
import { aacPictograms } from '@/data/aacPictograms'
import { translateText, detectLanguage, storeTranslatedContent } from '@/services/translationService'
import { useConversationLanguage } from '@/hooks/useConversationLanguage'
import { LanguageSelector } from '@/components/LanguageSelector'
import type { Pictogram, PictogramCategory } from '@/types'

// ─── IndexedDB helpers for offline message queuing ───────────────────────────

const IDB_DB_NAME = 'accessible_chat_db'
const IDB_STORE_NAME = 'pending_messages_queue'
const IDB_VERSION = 1

interface QueuedMessage {
  id: string
  content: string
  type: 'text' | 'pictogram' | 'voice'
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbEnqueue(msg: QueuedMessage): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite')
    tx.objectStore(IDB_STORE_NAME).put(msg)
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch { /* ignore — fallback to localStorage */ }
}

async function idbGetAll(): Promise<QueuedMessage[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(IDB_STORE_NAME, 'readonly')
    const store = tx.objectStore(IDB_STORE_NAME)
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as QueuedMessage[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite')
    tx.objectStore(IDB_STORE_NAME).clear()
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch { /* ignore */ }
}

// ─── Legacy localStorage helpers (for getQueueLength export) ─────────────────

const LS_QUEUE_KEY = 'pending_messages_queue'

function lsGetQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE_KEY) ?? '[]') as QueuedMessage[]
  } catch { return [] }
}

function lsSaveQueue(q: QueuedMessage[]): void {
  try { localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(q)) } catch { /* ignore */ }
}

/** Exported for tests — reads from localStorage (legacy) */
export function getQueueLength(): number {
  return lsGetQueue().length
}

// ─── Demo messages ────────────────────────────────────────────────────────────

const DEMO_MESSAGES: Message[] = [
  { id: '1', senderId: 'other', content: 'Hello! How are you today?', type: 'text', timestamp: Date.now() - 60000 },
  { id: '2', senderId: 'me', content: 'I am doing well, thank you!', type: 'text', timestamp: Date.now() - 30000 },
  { id: '3', senderId: 'other', content: 'Great to hear! Need any help?', type: 'text', timestamp: Date.now() - 10000 },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  senderId: string
  content: string
  type: 'text' | 'pictogram' | 'voice'
  translatedContent?: Record<string, string>
  timestamp: number
}

// ─── Pictogram categories for the picker ─────────────────────────────────────

const PICTOGRAM_CATEGORIES: PictogramCategory[] = [
  'greetings', 'needs', 'emotions', 'actions', 'food', 'people', 'places', 'activities', 'emergency',
]

// ─── Component ────────────────────────────────────────────────────────────────

interface AccessibleChatProps {
  chatId?: string
}

export function AccessibleChat({ chatId = 'demo' }: AccessibleChatProps) {
  const { preferences } = useAccessibility()
  syncTTSPreferences(preferences.ttsEnabled, preferences.audioSpeed)

  // Task 4.3.3 — per-conversation language preference
  const { conversationLang, setConversationLang } = useConversationLanguage(
    chatId,
    preferences.voiceLanguage?.split('-')[0] ?? 'en',
  )

  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES)
  const [input, setInput] = useState('')
  const [queueCount, setQueueCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [listening, setListening] = useState(false)
  const [showPictogramPicker, setShowPictogramPicker] = useState(false)
  const [pictoCategory, setPictoCategory] = useState<PictogramCategory>('greetings')

  const liveRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(messages.length)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Sync queue count from IndexedDB ──────────────────────────────────────
  const refreshQueueCount = useCallback(async () => {
    const q = await idbGetAll()
    setQueueCount(q.length)
    // Keep localStorage in sync for getQueueLength() export
    lsSaveQueue(q)
  }, [])

  useEffect(() => {
    void refreshQueueCount()
  }, [refreshQueueCount])

  // ── Online/offline detection + sync on reconnect ──────────────────────────
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      const queued = await idbGetAll()
      if (queued.length > 0) {
        // Attempt to write queued messages to Firestore
        if (firebaseConfigured) {
          try {
            const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore')
            const { firebaseApp } = await import('@/firebase')
            const db = getFirestore(firebaseApp)
            for (const qm of queued) {
              await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: 'me',
                content: qm.content,
                type: qm.type,
                timestamp: serverTimestamp(),
              })
            }
          } catch { /* Firestore unavailable — show locally */ }
        }
        // Show synced messages locally
        const synced: Message[] = queued.map((m) => ({
          id: m.id,
          senderId: 'me',
          content: m.content,
          type: m.type,
          timestamp: m.timestamp,
        }))
        setMessages((prev) => [...prev, ...synced])
        await idbClear()
        setQueueCount(0)
        lsSaveQueue([])
      }
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [chatId])

  // ── TTS for new incoming messages (Req 5.5) ───────────────────────────────
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newest = messages[messages.length - 1]
      if (newest.senderId !== 'me' && preferences.ttsEnabled) {
        ttsEngine.speak(newest.content)
      }

      // ── Task 4.3.4 — Auto-translate incoming messages ──────────────────
      // Detect language and translate to the conversation's preferred language.
      // Task 4.3.5 — Store translated content in Firestore.
      if (newest.senderId !== 'me' && !newest.translatedContent?.[conversationLang]) {
        void (async () => {
          const detectedLang = await detectLanguage(newest.content)
          if (detectedLang === conversationLang) return // same language — skip

          const translated = await translateText(newest.content, conversationLang, detectedLang)
          if (translated === newest.content) return // stub returned original — skip

          // Update local state
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newest.id
                ? { ...m, translatedContent: { ...m.translatedContent, [conversationLang]: translated } }
                : m,
            ),
          )

          // Task 4.3.5 — Persist to Firestore messages/{messageId}/translatedContent
          if (firebaseConfigured && chatId !== 'demo') {
            await storeTranslatedContent(chatId, newest.id, conversationLang, translated)
          }
        })()
      }
    }
    prevCountRef.current = messages.length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, preferences.ttsEnabled])

  // ── Auto-scroll to latest message ─────────────────────────────────────────
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.scrollTop = liveRef.current.scrollHeight
    }
  }, [messages])

  // ── Firestore real-time listener (Task 4.2.1) ─────────────────────────────
  useEffect(() => {
    if (!firebaseConfigured || !chatId) return
    let unsub: (() => void) | undefined
    ;(async () => {
      try {
        const { getFirestore, collection, onSnapshot, orderBy, query, limit } = await import('firebase/firestore')
        const { firebaseApp } = await import('@/firebase')
        const db = getFirestore(firebaseApp)
        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('timestamp', 'asc'),
          limit(50),
        )
        unsub = onSnapshot(q, (snap) => {
          const msgs: Message[] = snap.docs.map((d) => ({
            id: d.id,
            type: 'text',
            ...(d.data() as Omit<Message, 'id'>),
          }))
          setMessages(msgs)
        })
      } catch { /* Firebase unavailable — demo mode */ }
    })()
    return () => unsub?.()
  }, [chatId])

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(content = input.trim(), type: Message['type'] = 'text') {
    if (!content) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      content,
      type,
      timestamp: Date.now(),
    }

    if (!isOnline) {
      // Queue to IndexedDB (Req 5.6)
      const qm: QueuedMessage = { id: msg.id, content: msg.content, type: msg.type, timestamp: msg.timestamp }
      await idbEnqueue(qm)
      await refreshQueueCount()
    } else if (firebaseConfigured) {
      try {
        const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore')
        const { firebaseApp } = await import('@/firebase')
        const db = getFirestore(firebaseApp)
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: 'me',
          content: msg.content,
          type: msg.type,
          timestamp: serverTimestamp(),
        })
        // onSnapshot will update messages
      } catch {
        // Firestore write failed — queue to IndexedDB
        const qm: QueuedMessage = { id: msg.id, content: msg.content, type: msg.type, timestamp: msg.timestamp }
        await idbEnqueue(qm)
        await refreshQueueCount()
        // Show locally so user sees their message
        setMessages((prev) => [...prev, msg])
      }
    } else {
      // Demo mode — show locally
      setMessages((prev) => [...prev, msg])
    }

    if (type === 'text' || type === 'voice') setInput('')
  }

  // ── Voice input (Task 4.2.4 — Web Speech API STT) ────────────────────────
  function startVoiceInput() {
    const SR =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = preferences.voiceLanguage ?? 'en-US'
    r.interimResults = false
    r.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      setInput(transcript)
      setListening(false)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    r.start()
    setListening(true)
  }

  // ── Pictogram picker handler (Task 4.2.7) ─────────────────────────────────
  function insertPictogram(picto: Pictogram) {
    const phrase = picto.phrase
    setInput((prev) => (prev ? `${prev} ${phrase}` : phrase))
    setShowPictogramPicker(false)
    inputRef.current?.focus()
  }

  const filteredPictograms = aacPictograms.filter((p) => p.category === pictoCategory)

  return (
    <div className="flex flex-col h-full gap-2 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accessible Chat</h2>
        {/* Task 4.3.3 — Language selector per conversation */}
        <LanguageSelector
          value={conversationLang}
          onChange={setConversationLang}
          label="Translate to"
        />
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="rounded bg-yellow-100 border border-yellow-300 px-3 py-2 text-sm text-yellow-800 font-medium"
        >
          Offline — messages will sync when reconnected ({queueCount} queued)
        </div>
      )}

      {!firebaseConfigured && (
        <p className="text-xs text-gray-500" aria-label="Demo mode active">
          Demo mode — Firebase not configured
        </p>
      )}

      {/* Message list — role="log" + aria-live="polite" for screen readers (Req 5.3) */}
      <div
        ref={liveRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 p-3 min-h-[300px] max-h-[400px]"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-xl px-4 py-3 max-w-[75%] text-sm leading-relaxed ${
                m.senderId === 'me'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
              }`}
              aria-label={`${m.senderId === 'me' ? 'You' : 'Other'}: ${m.translatedContent?.[conversationLang] ?? m.content}`}
            >
              {m.type === 'pictogram' && (
                <span className="mr-1 text-base" aria-hidden="true">🖼️</span>
              )}
              {m.type === 'voice' && (
                <span className="mr-1 text-base" aria-hidden="true">🎤</span>
              )}
              {/* Task 4.3.4 — Show translated content when available */}
              {m.translatedContent?.[conversationLang] ? (
                <>
                  <span>{m.translatedContent[conversationLang]}</span>
                  <span className="block text-xs opacity-60 mt-1 italic">{m.content}</span>
                </>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pictogram picker panel (Task 4.2.7) */}
      {showPictogramPicker && (
        <div
          role="dialog"
          aria-label="Pictogram picker"
          aria-modal="true"
          className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 p-3 shadow-lg"
        >
          {/* Category tabs */}
          <div
            role="tablist"
            aria-label="Pictogram categories"
            className="flex flex-wrap gap-1 mb-3"
          >
            {PICTOGRAM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={pictoCategory === cat}
                onClick={() => setPictoCategory(cat)}
                className={`px-2 py-1 rounded text-xs font-medium min-h-[36px] capitalize transition-colors ${
                  pictoCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Pictogram grid */}
          <div
            role="tabpanel"
            aria-label={`${pictoCategory} pictograms`}
            className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto"
          >
            {filteredPictograms.map((picto) => (
              <button
                key={picto.id}
                onClick={() => insertPictogram(picto)}
                aria-label={`Insert pictogram: ${picto.ariaLabel}`}
                title={picto.phrase}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 p-2 min-h-[64px] min-w-[64px] hover:bg-blue-50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <span className="text-2xl" aria-hidden="true">{picto.svgPath}</span>
                <span className="text-xs text-center text-gray-700 dark:text-gray-200 leading-tight">
                  {picto.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPictogramPicker(false)}
            aria-label="Close pictogram picker"
            className="mt-2 w-full rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 min-h-[44px]"
          >
            Close
          </button>
        </div>
      )}

      {/* Input area (Req 5.1 — min 44×44px touch targets, high contrast, ARIA labels) */}
      <div className="flex gap-2 items-end">
        <label htmlFor="chat-input" className="sr-only">Type a message</label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { void sendMessage(); e.preventDefault() } }}
          placeholder="Type a message…"
          aria-label="Type a message"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />

        {/* Pictogram picker button (Task 4.2.7) */}
        <button
          onClick={() => setShowPictogramPicker((v) => !v)}
          aria-label={showPictogramPicker ? 'Close pictogram picker' : 'Open pictogram picker'}
          aria-expanded={showPictogramPicker}
          aria-haspopup="dialog"
          className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2 min-h-[44px] min-w-[44px] text-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          🖼️
        </button>

        {/* Voice input button (Task 4.2.4) */}
        <button
          onClick={startVoiceInput}
          aria-label={listening ? 'Listening for voice input…' : 'Start voice input'}
          aria-pressed={listening}
          className={`rounded-lg px-3 py-2 min-h-[44px] min-w-[44px] text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            listening
              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🎤
        </button>

        {/* Send button */}
        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim()}
          aria-label="Send message"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium min-h-[44px] hover:bg-blue-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Send
        </button>
      </div>

      {/* Listening status announcement for screen readers */}
      {listening && (
        <div role="status" aria-live="assertive" className="sr-only">
          Listening for voice input…
        </div>
      )}
    </div>
  )
}

export default AccessibleChat
