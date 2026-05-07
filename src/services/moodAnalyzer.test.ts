/**
 * Unit tests for Mood_Analyzer pure functions and side-effect stubs.
 * Requirements: 4.3, 4.4, 4.7
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { classifyFromScore, requiresNotification } from './moodAnalyzer'
import type { CheckInResponse } from '../types'

// ─── classifyFromScore ────────────────────────────────────────────────────────

describe('classifyFromScore', () => {
  it('returns severe_distress for score ≤ 1.5', () => {
    expect(classifyFromScore(1.0)).toBe('severe_distress')
    expect(classifyFromScore(1.5)).toBe('severe_distress')
  })

  it('returns moderate_distress for score > 1.5 and ≤ 2.5', () => {
    expect(classifyFromScore(1.6)).toBe('moderate_distress')
    expect(classifyFromScore(2.0)).toBe('moderate_distress')
    expect(classifyFromScore(2.5)).toBe('moderate_distress')
  })

  it('returns mild_distress for score > 2.5 and ≤ 3.5', () => {
    expect(classifyFromScore(2.6)).toBe('mild_distress')
    expect(classifyFromScore(3.0)).toBe('mild_distress')
    expect(classifyFromScore(3.5)).toBe('mild_distress')
  })

  it('returns calm for score > 3.5', () => {
    expect(classifyFromScore(3.6)).toBe('calm')
    expect(classifyFromScore(4.0)).toBe('calm')
    expect(classifyFromScore(5.0)).toBe('calm')
  })

  it('handles boundary at exactly 1.5', () => {
    expect(classifyFromScore(1.5)).toBe('severe_distress')
  })

  it('handles boundary at exactly 2.5', () => {
    expect(classifyFromScore(2.5)).toBe('moderate_distress')
  })

  it('handles boundary at exactly 3.5', () => {
    expect(classifyFromScore(3.5)).toBe('mild_distress')
  })
})

// ─── requiresNotification (FCM trigger threshold) ─────────────────────────────

describe('requiresNotification', () => {
  it('returns true for moderate_distress', () => {
    expect(requiresNotification('moderate_distress')).toBe(true)
  })

  it('returns true for severe_distress', () => {
    expect(requiresNotification('severe_distress')).toBe(true)
  })

  it('returns false for calm', () => {
    expect(requiresNotification('calm')).toBe(false)
  })

  it('returns false for mild_distress', () => {
    expect(requiresNotification('mild_distress')).toBe(false)
  })
})

// ─── IndexedDB retry path ─────────────────────────────────────────────────────

describe('analyzeMoodWithFallback — IndexedDB retry on API failure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('stores responses in checkin_drafts when API fails and returns stored=true', async () => {
    // Stub fetch to simulate Claude API failure
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    vi.stubEnv('VITE_CLAUDE_API_KEY', 'test-key')

    // Stub enqueueDraft so we don't need real IndexedDB
    const enqueueMock = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(await import('./checkinDraftQueue'), 'enqueueDraft').mockImplementation(enqueueMock)

    const { analyzeMoodWithFallback: analyzeFn } = await import('./moodAnalyzer')

    const responses: CheckInResponse[] = [
      { questionId: 'q1', modality: 'emoji_slider', value: 2 },
      { questionId: 'q2', modality: 'mood_card', value: 1 },
    ]

    const result = await analyzeFn('patient-1', responses, {
      patientId: 'patient-1',
      roomNumber: '101',
      consecutiveDays: 1,
    })

    expect(result.stored).toBe(true)
    expect(result.classification).toBeNull()
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        responses,
      })
    )
  })
})

// ─── enqueueDraft / dequeueDrafts (IndexedDB store) ──────────────────────────

describe('checkinDraftQueue', () => {
  it('enqueueDraft and dequeueDrafts are callable and return correct types', async () => {
    // Provide a minimal in-memory IndexedDB stub that matches the IDB event model
    const store: unknown[] = []
    let autoKey = 1

    function makeRequest<T>(resultValue: T) {
      const req = {
        result: resultValue,
        onsuccess: null as ((e: { target: { result: T } }) => void) | null,
        onerror: null,
      }
      // Trigger onsuccess on next tick
      setTimeout(() => req.onsuccess?.({ target: { result: resultValue } }), 0)
      return req
    }

    const mockObjectStore = {
      add: (value: unknown) => {
        store.push(value)
        return makeRequest(autoKey++)
      },
      getAll: () => makeRequest([...store]),
      clear: () => {
        store.length = 0
        return makeRequest(undefined)
      },
      count: () => makeRequest(store.length),
    }

    const mockTx = { objectStore: () => mockObjectStore }
    const mockDB = {
      transaction: () => mockTx,
      objectStoreNames: { contains: () => true },
    }

    const openReq = {
      result: mockDB,
      onsuccess: null as ((e: { target: { result: typeof mockDB } }) => void) | null,
      onerror: null,
      onupgradeneeded: null,
    }

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => openReq.onsuccess?.({ target: { result: mockDB } }), 0)
        return openReq
      },
    })

    const { enqueueDraft, dequeueDrafts } = await import('./checkinDraftQueue')

    const draft = {
      patientId: 'patient-test',
      responses: [{ questionId: 'q1', modality: 'emoji_slider' as const, value: 3 }],
      savedAt: Date.now(),
    }

    await enqueueDraft(draft)
    const drafts = await dequeueDrafts()

    expect(drafts.length).toBeGreaterThanOrEqual(1)
    const found = drafts.find((d) => d.patientId === 'patient-test')
    expect(found).toBeDefined()
    expect(found?.responses[0].questionId).toBe('q1')

    vi.unstubAllGlobals()
  })
})
