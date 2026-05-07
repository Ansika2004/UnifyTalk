/**
 * useConversationLanguage — per-conversation language preference hook (Task 4.3.3)
 *
 * Stores the user's preferred translation target language for a given chat.
 * Persisted to localStorage so the preference survives page reloads.
 */
import { useState, useCallback } from 'react'

const STORAGE_PREFIX = 'conv_lang_'

function storageKey(chatId: string): string {
  return `${STORAGE_PREFIX}${chatId}`
}

function readStored(chatId: string, fallback: string): string {
  try {
    return localStorage.getItem(storageKey(chatId)) ?? fallback
  } catch {
    return fallback
  }
}

function writeStored(chatId: string, lang: string): void {
  try {
    localStorage.setItem(storageKey(chatId), lang)
  } catch { /* ignore */ }
}

export interface UseConversationLanguageReturn {
  /** Current target language for this conversation (BCP-47 code, e.g. "en", "es") */
  conversationLang: string
  /** Update the target language for this conversation */
  setConversationLang: (lang: string) => void
}

/**
 * @param chatId       - Unique chat identifier
 * @param defaultLang  - Fallback language when no preference is stored (default: "en")
 */
export function useConversationLanguage(
  chatId: string,
  defaultLang = 'en',
): UseConversationLanguageReturn {
  const [conversationLang, setLangState] = useState<string>(() =>
    readStored(chatId, defaultLang),
  )

  const setConversationLang = useCallback(
    (lang: string) => {
      setLangState(lang)
      writeStored(chatId, lang)
    },
    [chatId],
  )

  return { conversationLang, setConversationLang }
}
