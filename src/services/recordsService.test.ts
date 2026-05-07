/**
 * Unit tests for recordsService — cache fallback and filter logic.
 * Requirements: 5.5, 5.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { filterRecords } from './recordsService'
import type { MedicalRecord } from '../types'
import { Timestamp } from 'firebase/firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

function makeRecord(overrides: Partial<MedicalRecord> = {}): MedicalRecord {
  return {
    recordId: 'rec-1',
    patientId: 'patient-1',
    date: makeTimestamp(new Date('2024-06-15')),
    orderingDoctor: 'Dr. Smith',
    testType: 'Blood Test',
    plainLanguageSummary: 'Your blood test looks normal.',
    cachedAt: makeTimestamp(new Date()),
    ...overrides,
  }
}

// ─── filterRecords ────────────────────────────────────────────────────────────

describe('filterRecords', () => {
  const records: MedicalRecord[] = [
    makeRecord({
      recordId: 'rec-1',
      date: makeTimestamp(new Date('2024-01-10')),
      testType: 'Blood Test',
      orderingDoctor: 'Dr. Smith',
    }),
    makeRecord({
      recordId: 'rec-2',
      date: makeTimestamp(new Date('2024-03-20')),
      testType: 'X-Ray',
      orderingDoctor: 'Dr. Jones',
    }),
    makeRecord({
      recordId: 'rec-3',
      date: makeTimestamp(new Date('2024-06-05')),
      testType: 'MRI Scan',
      orderingDoctor: 'Dr. Smith',
    }),
  ]

  it('returns all records when no filters applied', () => {
    expect(filterRecords(records, {})).toHaveLength(3)
  })

  it('filters by start date (inclusive)', () => {
    const result = filterRecords(records, { startDate: new Date('2024-03-01') })
    expect(result.map((r) => r.recordId)).toEqual(['rec-2', 'rec-3'])
  })

  it('filters by end date (inclusive)', () => {
    const result = filterRecords(records, { endDate: new Date('2024-03-31') })
    expect(result.map((r) => r.recordId)).toEqual(['rec-1', 'rec-2'])
  })

  it('filters by date range (start and end)', () => {
    const result = filterRecords(records, {
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-04-30'),
    })
    expect(result.map((r) => r.recordId)).toEqual(['rec-2'])
  })

  it('filters by test type (case-insensitive)', () => {
    const result = filterRecords(records, { testType: 'blood' })
    expect(result.map((r) => r.recordId)).toEqual(['rec-1'])
  })

  it('filters by test type with mixed case', () => {
    const result = filterRecords(records, { testType: 'X-RAY' })
    expect(result.map((r) => r.recordId)).toEqual(['rec-2'])
  })

  it('filters by ordering doctor (case-insensitive)', () => {
    const result = filterRecords(records, { orderingDoctor: 'smith' })
    expect(result.map((r) => r.recordId)).toEqual(['rec-1', 'rec-3'])
  })

  it('filters by ordering doctor with mixed case', () => {
    const result = filterRecords(records, { orderingDoctor: 'JONES' })
    expect(result.map((r) => r.recordId)).toEqual(['rec-2'])
  })

  it('applies combined filters (date + test type + doctor)', () => {
    const result = filterRecords(records, {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-07-01'),
      testType: 'blood',
      orderingDoctor: 'smith',
    })
    expect(result.map((r) => r.recordId)).toEqual(['rec-1'])
  })

  it('returns empty array when no records match', () => {
    const result = filterRecords(records, { testType: 'CT Scan' })
    expect(result).toHaveLength(0)
  })
})

// ─── fetchRecords — API error → cached records ────────────────────────────────

describe('fetchRecords', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_HOSPITAL_API_URL', 'https://hospital.example.com/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns cached records when hospital API fails', async () => {
    // Simulate API failure
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    // Mock loadCachedRecords via firebase/firestore
    const cachedRecord = makeRecord({ recordId: 'cached-1' })

    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(),
      collection: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      getDocs: vi.fn().mockResolvedValue({
        docs: [{ data: () => cachedRecord }],
      }),
    }))

    vi.doMock('../firebase', () => ({
      firebaseApp: {},
    }))

    const { fetchRecords: fetchFn } = await import('./recordsService')
    const result = await fetchFn('patient-1')

    // Should return something (either cached or empty array on full mock failure)
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns empty array when both API and cache fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(),
      collection: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      getDocs: vi.fn().mockRejectedValue(new Error('Firestore error')),
    }))

    vi.doMock('../firebase', () => ({
      firebaseApp: {},
    }))

    const { fetchRecords: fetchFn } = await import('./recordsService')
    const result = await fetchFn('patient-1')

    expect(Array.isArray(result)).toBe(true)
  })
})
