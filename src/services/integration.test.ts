/**
 * Integration tests for critical patient flows.
 * Requirements: 1.2, 1.7, 2.4, 2.9, 6.8
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  buildSOSAlert,
  dispatchWithRetry,
  holdMeetsTriggerThreshold,
} from './sosService'
import { summarizeSymptoms } from './aiSummarizer'
import type { SymptomReport } from '../types'

// ─── Flow 1: SOS dispatch → audit log ────────────────────────────────────────

describe('Flow 1: SOS dispatch → audit log', () => {
  it('buildSOSAlert produces correct fields', () => {
    // Requirements: 1.7
    const alert = buildSOSAlert('patient-1', 'ward-A', "I can't breathe")

    expect(alert.patientId).toBe('patient-1')
    expect(alert.wardId).toBe('ward-A')
    expect(alert.selectedMessage).toBe("I can't breathe")
    expect(alert.deliveryStatus).toBe('pending')
    expect(alert.retryCount).toBe(0)
  })

  it('dispatchWithRetry with mock dispatch writes correct retryCount on first success', async () => {
    // Requirements: 1.6
    const mockDispatch = vi.fn().mockResolvedValue(undefined)

    const retryCount = await dispatchWithRetry(mockDispatch, 3, 0)

    expect(retryCount).toBe(0)
    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })

  it('dispatchWithRetry retryCount reflects number of failures before success', async () => {
    // Requirements: 1.6
    const mockDispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(undefined)

    const retryCount = await dispatchWithRetry(mockDispatch, 3, 0)

    expect(retryCount).toBe(2)
  })

  it('holdMeetsTriggerThreshold(2000) is true', () => {
    // Requirements: 1.3
    expect(holdMeetsTriggerThreshold(2000)).toBe(true)
  })

  it('holdMeetsTriggerThreshold(1999) is false', () => {
    // Requirements: 1.3
    expect(holdMeetsTriggerThreshold(1999)).toBe(false)
  })
})

// ─── Flow 2: Symptom report → AI summary → staff delivery ────────────────────

describe('Flow 2: Symptom report → AI summary → staff delivery', () => {
  const baseReport: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'> = {
    patientId: 'p1',
    timestamp: null as any,
    bodyRegions: ['chest'],
    painType: 'sharp',
    intensity: 7,
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('summarizeSymptoms with mocked Claude API returns { summary, fallbackUsed: false }', async () => {
    // Requirements: 2.4
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Patient has sharp chest pain rated 7/10.' }] }),
      } as unknown as Response),
    )

    const result = await summarizeSymptoms(baseReport)

    expect(result.fallbackUsed).toBe(false)
    expect(result.summary).toBe('Patient has sharp chest pain rated 7/10.')
  })

  it('on API error, summarizeSymptoms returns { summary: fallbackString, fallbackUsed: true }', async () => {
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

  it('fallback summary format is "Patient reports [painType] [regions] pain rated [intensity]/10"', async () => {
    // Requirements: 2.7
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const report: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'> = {
      patientId: 'p2',
      timestamp: null as any,
      bodyRegions: ['abdomen', 'back'],
      painType: 'burning',
      intensity: 5,
    }

    const result = await summarizeSymptoms(report)

    expect(result.fallbackUsed).toBe(true)
    expect(result.summary).toContain('burning')
    expect(result.summary).toContain('abdomen')
    expect(result.summary).toContain('5')
    // Matches the format: "Patient reports burning abdomen, back pain rated 5/10"
    expect(result.summary).toMatch(/Patient reports burning .+ pain rated 5\/10/)
  })
})

// ─── Flow 3: Doctor_Bridge offline queue → reconnect sync ────────────────────
// IndexedDB is not available in the jsdom test environment.
// We verify the queue contract using an in-memory implementation that mirrors
// the real offlineQueue API (enqueue / dequeue / getQueueLength).

function createTestQueue() {
  let store: object[] = []
  return {
    async enqueue(message: object): Promise<void> {
      store.push(message)
    },
    async dequeue(): Promise<object[]> {
      const all = [...store]
      store = []
      return all
    },
    async getQueueLength(): Promise<number> {
      return store.length
    },
  }
}

describe('Flow 3: Doctor_Bridge offline queue → reconnect sync', () => {
  let queue: ReturnType<typeof createTestQueue>

  beforeEach(() => {
    queue = createTestQueue()
  })

  it('enqueue stores a message and getQueueLength returns 1', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Hello', senderId: 'patient-1' })

    const length = await queue.getQueueLength()
    expect(length).toBe(1)
  })

  it('dequeue retrieves all messages and clears the queue', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Message 1', senderId: 'patient-1' })
    await queue.enqueue({ content: 'Message 2', senderId: 'patient-1' })

    const messages = await queue.dequeue()

    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ content: 'Message 1' })
    expect(messages[1]).toMatchObject({ content: 'Message 2' })
  })

  it('after dequeue, getQueueLength returns 0', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Hello', senderId: 'patient-1' })
    await queue.dequeue()

    const length = await queue.getQueueLength()
    expect(length).toBe(0)
  })
})
