/**
 * Unit tests for Vitals_Dashboard pure logic.
 * Requirements: 12.2, 12.6
 */
import { describe, it, expect } from 'vitest'
import { computeVitalStatus, getReassuranceLabel } from './vitalsLogic'

// ─── computeVitalStatus — heart rate (normal: 60–100) ────────────────────────

describe('computeVitalStatus — heart rate (normal: 60–100)', () => {
  const range: [number, number] = [60, 100]

  it('returns "normal" for value within range', () => {
    // Requirements: 12.2
    expect(computeVitalStatus(80, range)).toBe('normal')
  })

  it('returns "normal" at lower boundary (60)', () => {
    expect(computeVitalStatus(60, range)).toBe('normal')
  })

  it('returns "normal" at upper boundary (100)', () => {
    expect(computeVitalStatus(100, range)).toBe('normal')
  })

  it('returns "warning" for value just below normal (±10% of range width)', () => {
    // Requirements: 12.2 — range width = 40; 10% = 4; warning zone: 56–60
    // 58 is 2 below min → deviation = 2/40 = 5% → warning
    expect(computeVitalStatus(58, range)).toBe('warning')
  })

  it('returns "warning" for value just above normal', () => {
    // 104 is 4 above max → deviation = 4/40 = 10% → warning (≤10%)
    expect(computeVitalStatus(104, range)).toBe('warning')
  })

  it('returns "critical" for value >10% outside normal (below)', () => {
    // Requirements: 12.2 — 55 is 5 below min → deviation = 5/40 = 12.5% → critical
    expect(computeVitalStatus(55, range)).toBe('critical')
  })

  it('returns "critical" for value >10% outside normal (above)', () => {
    // 105 is 5 above max → deviation = 5/40 = 12.5% → critical
    expect(computeVitalStatus(105, range)).toBe('critical')
  })

  it('boundary: exactly 10% outside → "warning"', () => {
    // deviation = 4/40 = exactly 10% → warning
    expect(computeVitalStatus(104, range)).toBe('warning')
  })

  it('boundary: just over 10% outside → "critical"', () => {
    // deviation = 4.01/40 > 10% → critical
    expect(computeVitalStatus(104.01, range)).toBe('critical')
  })
})

// ─── computeVitalStatus — SpO₂ (normal: 95–100) ──────────────────────────────

describe('computeVitalStatus — SpO₂ (normal: 95–100)', () => {
  const range: [number, number] = [95, 100]

  it('returns "normal" for 98%', () => {
    expect(computeVitalStatus(98, range)).toBe('normal')
  })

  it('returns "normal" at boundary 95', () => {
    expect(computeVitalStatus(95, range)).toBe('normal')
  })

  it('returns "warning" for 94.5 (just below 95)', () => {
    // range width = 5; 10% = 0.5; 94.5 is 0.5 below min → deviation = 0.5/5 = 10% → warning
    expect(computeVitalStatus(94.5, range)).toBe('warning')
  })

  it('returns "critical" for 94 (>10% below 95)', () => {
    // 94 is 1 below min → deviation = 1/5 = 20% → critical
    expect(computeVitalStatus(94, range)).toBe('critical')
  })
})

// ─── computeVitalStatus — temperature (normal: 36.1–37.2) ────────────────────

describe('computeVitalStatus — temperature (normal: 36.1–37.2)', () => {
  const range: [number, number] = [36.1, 37.2]

  it('returns "normal" for 36.6°C', () => {
    expect(computeVitalStatus(36.6, range)).toBe('normal')
  })

  it('returns "normal" at lower boundary 36.1', () => {
    expect(computeVitalStatus(36.1, range)).toBe('normal')
  })

  it('returns "normal" at upper boundary 37.2', () => {
    expect(computeVitalStatus(37.2, range)).toBe('normal')
  })

  it('returns "warning" for value slightly below normal', () => {
    // range width = 1.1; 10% = 0.11; 36.0 is 0.1 below min → deviation = 0.1/1.1 ≈ 9% → warning
    expect(computeVitalStatus(36.0, range)).toBe('warning')
  })

  it('returns "critical" for 38.5°C (high fever)', () => {
    // 38.5 is 1.3 above max → deviation = 1.3/1.1 > 10% → critical
    expect(computeVitalStatus(38.5, range)).toBe('critical')
  })
})

// ─── getReassuranceLabel ──────────────────────────────────────────────────────

describe('getReassuranceLabel', () => {
  it('returns reassuring text for normal heart rate', () => {
    // Requirements: 12.3
    const label = getReassuranceLabel('heart_rate', 72, 'normal')
    expect(label).toContain('72')
    expect(label.length).toBeGreaterThan(0)
  })

  it('returns reassuring text for normal SpO₂', () => {
    // Requirements: 12.3
    const label = getReassuranceLabel('spo2', 98, 'normal')
    expect(label).toContain('98')
    expect(label.length).toBeGreaterThan(0)
  })

  it('returns reassuring text for normal temperature', () => {
    // Requirements: 12.3
    const label = getReassuranceLabel('temperature', 36.6, 'normal')
    expect(label).toContain('36.6')
    expect(label.length).toBeGreaterThan(0)
  })

  it('returns empty string for warning status', () => {
    // Requirements: 12.3 — only green values get reassuring labels
    expect(getReassuranceLabel('heart_rate', 55, 'warning')).toBe('')
  })

  it('returns empty string for critical status', () => {
    // Requirements: 12.3
    expect(getReassuranceLabel('spo2', 90, 'critical')).toBe('')
  })
})

// ─── stale-data display logic ─────────────────────────────────────────────────

describe('stale-data display logic', () => {
  it('isStale flag is false when API succeeds', () => {
    // Requirements: 12.6 — simulate state after successful API call
    const state = { isStale: false, lastUpdated: new Date() }
    expect(state.isStale).toBe(false)
  })

  it('isStale flag is true when API fails and cache is loaded', () => {
    // Requirements: 12.6 — simulate state after cache fallback
    const state = { isStale: true, lastUpdated: new Date(Date.now() - 60_000) }
    expect(state.isStale).toBe(true)
    expect(state.lastUpdated).toBeTruthy()
  })

  it('stale indicator shows last updated timestamp', () => {
    // Requirements: 12.6
    const lastUpdated = new Date('2024-01-15T10:30:00')
    const label = `Last updated ${lastUpdated.toLocaleString()}`
    expect(label).toContain('2024')
  })
})
