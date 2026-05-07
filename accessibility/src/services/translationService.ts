// Translation Service
// Online: Google Translate REST API (VITE_GOOGLE_TRANSLATE_KEY)
// Offline: ML Kit stub — returns original text when offline or key not set

const TRANSLATE_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.VITE_GOOGLE_TRANSLATE_KEY as string | undefined)
  : undefined

const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2'

// ─── ML Kit offline stub ──────────────────────────────────────────────────────
// @mlkit/translate-text is not available in the browser bundle; we provide a
// stub that returns the original text so the app degrades gracefully offline.
async function mlKitTranslateOffline(text: string, _targetLang: string): Promise<string> {
  // In a real React Native / Capacitor build this would call the native ML Kit
  // translate API. In the web PWA we return the original text unchanged.
  return text
}

// ─── Google Translate API (online) ───────────────────────────────────────────
async function googleTranslateOnline(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<string | null> {
  if (!TRANSLATE_API_KEY) return null
  try {
    const body: Record<string, string> = { q: text, target: targetLang, format: 'text' }
    if (sourceLang) body.source = sourceLang
    const res = await fetch(`${TRANSLATE_API_URL}?key=${TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      data: { translations: Array<{ translatedText: string }> }
    }
    return data.data.translations[0]?.translatedText ?? null
  } catch {
    return null
  }
}

/**
 * Translate `text` to `targetLang`.
 * Strategy: try Google Translate API (online) first; fall back to ML Kit stub
 * (offline / no key configured).
 *
 * @param text       - Source text to translate
 * @param targetLang - BCP-47 language code, e.g. "es", "fr", "hi"
 * @param sourceLang - Optional source language; omit for auto-detect
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<string> {
  if (!text.trim()) return text

  // 1. Try online Google Translate
  const online = await googleTranslateOnline(text, targetLang, sourceLang)
  if (online !== null) return online

  // 2. Fall back to ML Kit offline stub
  return mlKitTranslateOffline(text, targetLang)
}

/**
 * Detect the language of `text` using Google Translate API.
 * Falls back to 'en' when the API is unavailable.
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text.trim()) return 'en'

  if (TRANSLATE_API_KEY) {
    try {
      const res = await fetch(`${TRANSLATE_API_URL}/detect?key=${TRANSLATE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
      })
      if (res.ok) {
        const data = await res.json() as {
          data: { detections: Array<Array<{ language: string }>> }
        }
        return data.data.detections[0]?.[0]?.language ?? 'en'
      }
    } catch { /* fall through */ }
  }

  return 'en'
}

/**
 * Store translated content back to the Firestore message document.
 * Path: chats/{chatId}/messages/{messageId}
 * Field: translatedContent[targetLang] = translatedText
 */
export async function storeTranslatedContent(
  chatId: string,
  messageId: string,
  targetLang: string,
  translatedText: string,
): Promise<void> {
  try {
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore')
    const { firebaseApp } = await import('@/firebase')
    const db = getFirestore(firebaseApp)
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId)
    await updateDoc(msgRef, {
      [`translatedContent.${targetLang}`]: translatedText,
    })
  } catch {
    // Firestore unavailable — translation still shown locally
  }
}
