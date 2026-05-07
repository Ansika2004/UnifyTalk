import { describe, it, expect, vi, afterEach } from 'vitest'
import { summarizeSymptoms, summarizePictograms } from './aiSummarizer'
import type { Pictogram, SymptomReport } from '../types'

// Helpers
function makeClaudeResponse(text: string): Response {
  return {
    ok: true,
    json: async () => ({ content: [{ text }] }),
  } as unknown as Response
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── summarizeSymptoms ────────────────────────────────────────────────────────

describe('summarizeSymptoms', () => {
  const baseReport: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'> = {
    patientId: 'p1',
    timestamp: null as any,
    bodyRegions: ['chest'],
    painType: 'sharp',
    intensity: 7,
  }

  it('returns AI summary on success', async () => {
    // Requirements: 2.4
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeClaudeResponse('AI text')))

    const result = await summarizeSymptoms(baseReport)

    expect(result).toEqual({ summary: 'AI text', fallbackUsed: false })
  })

  it('returns fallback on API error (non-ok response)', async () => {
    // Requirements: 2.7
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 } as unknown as Response),
    )

    const result = await summarizeSymptoms(baseReport)

    expect(result.fallbackUsed).toBe(true)
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('returns fallback on fetch throw', async () => {
    // Requirements: 2.7
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await summarizeSymptoms(baseReport)

    expect(result.fallbackUsed).toBe(true)
  })

  it('fallback format contains pain type, body region, and intensity', async () => {
    // Requirements: 2.7
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const report: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'> = {
      patientId: 'p2',
      timestamp: null as any,
      bodyRegions: ['abdomen'],
      painType: 'burning',
      intensity: 4,
    }

    const result = await summarizeSymptoms(report)

    expect(result.summary).toContain('burning')
    expect(result.summary).toContain('abdomen')
    expect(result.summary).toContain('4')
  })
})

// ─── summarizePictograms ──────────────────────────────────────────────────────

const mockSymbols: Pictogram[] = [
  { id: '1', category: 'needs', label: 'water', iconUrl: '/water.svg', keywords: ['water'] },
  { id: '2', category: 'pain', label: 'head pain', iconUrl: '/head.svg', keywords: ['head'] },
]

describe('summarizePictograms', () => {
  it('returns AI sentence on success', async () => {
    // Requirements: 2.4
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeClaudeResponse('The patient needs water and has head pain.')),
    )

    const result = await summarizePictograms(mockSymbols)

    expect(result).toBe('The patient needs water and has head pain.')
  })

  it('returns joined labels on API error', async () => {
    // Requirements: 2.7
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await summarizePictograms(mockSymbols)

    expect(result).toBe('water head pain')
  })

  it('returns empty string for empty symbols array', async () => {
    // Requirements: 2.9
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await summarizePictograms([])

    expect(result).toBe('')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
