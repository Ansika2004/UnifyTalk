import type { Pictogram, SymptomReport } from '../types'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-3-haiku-20240307'
const MAX_TOKENS = 256

async function callClaude(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY as string
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return (data.content?.[0]?.text ?? '') as string
}

/**
 * Converts a sequence of pictogram symbols into a natural-language sentence
 * using the Claude API. Falls back to joining labels with spaces on error.
 */
export async function summarizePictograms(symbols: Pictogram[]): Promise<string> {
  if (symbols.length === 0) return ''

  const labels = symbols.map((s) => s.label).join(', ')
  const prompt = `Convert these pictogram symbols into a natural medical sentence: ${labels}`

  try {
    return await callClaude(prompt)
  } catch {
    return symbols.map((s) => s.label).join(' ')
  }
}

/**
 * Generates a natural-language AI summary for a symptom report.
 * Falls back to a raw structured string on API error.
 */
export async function summarizeSymptoms(
  report: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'>
): Promise<{ summary: string; fallbackUsed: boolean }> {
  const regions = report.bodyRegions.join(', ')
  const notePart = report.freeTextNote ? `, ${report.freeTextNote}` : ''
  const prompt = `Patient reports ${report.painType} ${regions} pain rated ${report.intensity}/10${notePart}`

  try {
    const summary = await callClaude(prompt)
    return { summary, fallbackUsed: false }
  } catch {
    return { summary: prompt, fallbackUsed: true }
  }
}

/**
 * Generates a plain-language summary of a medical record, replacing jargon
 * with patient-friendly language. Falls back to the original text on error.
 * Requirements: 5.2
 */
export async function summarizeRecord(originalText: string): Promise<string> {
  if (!originalText.trim()) return ''

  const prompt =
    `Convert the following medical record text into plain language that a patient can easily understand. ` +
    `Replace all medical jargon with simple words. Keep it concise and reassuring.\n\n${originalText}`

  try {
    return await callClaude(prompt)
  } catch {
    return originalText
  }
}
