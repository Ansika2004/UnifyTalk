import type { Pictogram } from '@/types'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function isClaudeAvailable(): boolean {
  return Boolean(import.meta.env.VITE_CLAUDE_API_KEY)
}

/**
 * Send a conversational message to Claude and return the reply.
 * Falls back gracefully when the API key is missing or the request fails.
 * Requirement 18.2: respond within 3 seconds (enforced by AbortController timeout).
 * Requirement 18.5: graceful fallback when Claude cannot fulfill request.
 */
export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<{ text: string; isError: boolean }> {
  if (!isClaudeAvailable()) {
    return {
      text: 'AI assistant is currently unavailable. You can try: the AAC pictogram board, pre-saved phrases, or the live captions feature.',
      isError: true,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const messages: ChatMessage[] = [
      ...history,
      { role: 'user', content: userMessage },
    ]

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 512,
        system:
          'You are a patient, accessible AI assistant for a communication platform used by differently-abled users (Deaf, Hard of Hearing, Mute, Non-verbal, Blind, Low Vision). Keep responses concise, clear, and jargon-free. If you cannot fulfill a request, acknowledge the limitation and suggest an alternative platform feature.',
        messages,
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        text: 'I was unable to process your request right now. You can try: the AAC pictogram board, pre-saved phrases, or contact a communication buddy.',
        isError: true,
      }
    }

    const data = (await response.json()) as { content: Array<{ text: string }> }
    const text = data.content?.[0]?.text?.trim()

    if (!text) {
      return {
        text: 'I received an empty response. Please try again or use the AAC board to communicate.',
        isError: true,
      }
    }

    return { text, isError: false }
  } catch (err) {
    clearTimeout(timeout)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return {
      text: isTimeout
        ? 'The AI assistant took too long to respond. You can try: the AAC pictogram board, pre-saved phrases, or the live captions feature.'
        : 'AI assistant is currently unavailable. You can try: the AAC pictogram board, pre-saved phrases, or the live captions feature.',
      isError: true,
    }
  }
}

/**
 * Send a base64-encoded image to Claude Vision API and return a descriptive string.
 * Requirement 12.1, 12.2: generate alt text / audio description for images.
 * Falls back to "Image description unavailable" when API key is not configured or request fails.
 */
export async function describeImage(imageBase64: string, mimeType: string): Promise<string> {
  const FALLBACK = 'Image description unavailable'

  if (!isClaudeAvailable()) return FALLBACK

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Describe this image in clear, concise language suitable for a visually impaired user. Focus on the main subject, key details, and any text visible in the image. Keep the description under 100 words.',
              },
            ],
          },
        ],
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) return FALLBACK

    const data = (await response.json()) as { content: Array<{ text: string }> }
    const text = data.content?.[0]?.text?.trim()
    return text || FALLBACK
  } catch {
    clearTimeout(timeout)
    return FALLBACK
  }
}

export async function generateSentenceFromPictograms(pictograms: Pictogram[]): Promise<string> {
  if (pictograms.length === 0) return ''

  const fallback = pictograms.map((p) => p.phrase).join(' ')

  if (!isClaudeAvailable()) return fallback

  try {
    const labels = pictograms.map((p) => p.label).join(', ')
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You are an AAC (Augmentative and Alternative Communication) assistant. Convert these pictogram labels into a natural, clear sentence for a non-verbal user: ${labels}. Reply with only the sentence, nothing else.`,
          },
        ],
      }),
    })

    if (!response.ok) return fallback

    const data = (await response.json()) as { content: Array<{ text: string }> }
    return data.content?.[0]?.text?.trim() ?? fallback
  } catch {
    return fallback
  }
}
