/**
 * On-device ML Kit translation stub.
 * ML Kit is a native mobile SDK and is not available as a browser npm package.
 * This stub always throws so the caller falls back to the Google Translate REST API.
 * Requirement 7.6: prefer on-device translation where available.
 */
export async function mlKitTranslate(
  _text: string,
  _targetLocale: string,
): Promise<string> {
  throw new Error('ML Kit not available')
}

/**
 * Translate `text` into `targetLocale`.
 *
 * Strategy (Requirement 7.6):
 *  1. Try ML Kit on-device translation (stub — always throws in browser).
 *  2. Fall back to Google Translate REST API using VITE_GOOGLE_TRANSLATE_API_KEY.
 *  3. If both fail, return the original text unchanged.
 *
 * Requirements: 7.3, 7.5, 7.6
 */
export async function translateContent(
  text: string,
  targetLocale: string,
): Promise<string> {
  // 1. Attempt on-device ML Kit translation
  try {
    return await mlKitTranslate(text, targetLocale)
  } catch {
    // ML Kit unavailable — fall through to cloud API
  }

  // 2. Fall back to Google Translate REST API
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY as string | undefined
  if (apiKey) {
    try {
      const url = 'https://translation.googleapis.com/language/translate/v2'
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLocale,
          key: apiKey,
        }),
      })

      if (response.ok) {
        const data = (await response.json()) as {
          data: { translations: Array<{ translatedText: string }> }
        }
        return data.data.translations[0]?.translatedText ?? text
      }
    } catch {
      // Network or API error — fall through to original text
    }
  }

  // 3. Both strategies failed — return original text unchanged
  return text
}
