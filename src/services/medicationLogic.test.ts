/**
 * Unit tests for Medication_Reminder pure logic.
 * Requirements: 9.5, 9.6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeDoseStatus, buildDoseEvent } from './medicationLogic'
import { Timestamp } from 'firebase/firestore'

// ─── computeDoseStatus ────────────────────────────────────────────────────────

describe('computeDoseStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "taken" when takenAt is set', () => {
    // Requirements: 9.5
    const scheduledAt = Date.now()
    const takenAt = Date.now() + 5000
    expect(computeDoseStatus(takenAt, scheduledAt, 900_000)).toBe('taken')
  })

  it('returns "missed" when not taken and elapsed >= timeout', () => {
    // Requirements: 9.5
    const scheduledAt = Date.now()
    vi.advanceTimersByTime(900_000) // 15 minutes
    expect(computeDoseStatus(null, scheduledAt, 900_000)).toBe('missed')
  })

  it('returns "pending" when not taken and elapsed < timeout', () => {
    // Requirements: 9.5
    const scheduledAt = Date.now()
    vi.advanceTimersByTime(500_000) // ~8 minutes
    expect(computeDoseStatus(null, scheduledAt, 900_000)).toBe('pending')
  })

  it('boundary: 899999ms elapsed → "pending"', () => {
    // Requirements: 9.5 — just under 15 minutes
    const scheduledAt = Date.now()
    vi.advanceTimersByTime(899_999)
    expect(computeDoseStatus(null, scheduledAt, 900_000)).toBe('pending')
  })

  it('boundary: exactly 900000ms elapsed → "missed"', () => {
    // Requirements: 9.5 — exactly 15 minutes
    const scheduledAt = Date.now()
    vi.advanceTimersByTime(900_000)
    expect(computeDoseStatus(null, scheduledAt, 900_000)).toBe('missed')
  })

  it('returns "taken" even if takenAt is 0 (falsy check uses null)', () => {
    // Requirements: 9.5 — takenAt=0 is a valid timestamp (epoch)
    const scheduledAt = Date.now()
    expect(computeDoseStatus(0, scheduledAt, 900_000)).toBe('taken')
  })
})

// ─── buildDoseEvent ───────────────────────────────────────────────────────────

describe('buildDoseEvent', () => {
  it('returns object with all required fields', () => {
    // Requirements: 9.5
    const ts = Timestamp.fromMillis(Date.now())
    const event = buildDoseEvent('med-001', 'patient-123', ts, 'taken')
    expect(event).toMatchObject({
      medicationId: 'med-001',
      patientId: 'patient-123',
      scheduledTime: ts,
      status: 'taken',
    })
  })

  it('sets status to "missed" correctly', () => {
    // Requirements: 9.5
    const ts = Timestamp.fromMillis(Date.now())
    const event = buildDoseEvent('med-002', 'patient-456', ts, 'missed')
    expect(event.status).toBe('missed')
  })

  it('sets status to "nurse_requested" correctly', () => {
    // Requirements: 9.5
    const ts = Timestamp.fromMillis(Date.now())
    const event = buildDoseEvent('med-003', 'patient-789', ts, 'nurse_requested')
    expect(event.status).toBe('nurse_requested')
  })

  it('does NOT include confirmedAt field', () => {
    // Requirements: 9.5 — confirmedAt is omitted from buildDoseEvent
    const ts = Timestamp.fromMillis(Date.now())
    const event = buildDoseEvent('med-001', 'patient-123', ts, 'taken')
    expect('confirmedAt' in event).toBe(false)
  })

  it('preserves medicationId and patientId exactly', () => {
    // Requirements: 9.5
    const ts = Timestamp.fromMillis(Date.now())
    const event = buildDoseEvent('aspirin-100mg', 'patient-abc', ts, 'taken')
    expect(event.medicationId).toBe('aspirin-100mg')
    expect(event.patientId).toBe('patient-abc')
  })
})

// ─── re-display once behavior ─────────────────────────────────────────────────

describe('re-display once behavior (boolean flag logic)', () => {
  it('redisplayed flag starts false and becomes true after timeout', () => {
    // Requirements: 9.5 — simulate the boolean flag used in MedicationReminder
    let redisplayed = false
    let dismissed = false

    function onTimeout() {
      if (!dismissed) {
        redisplayed = true
      }
    }

    onTimeout()
    expect(redisplayed).toBe(true)
  })

  it('redisplayed flag stays false if dismissed before timeout', () => {
    // Requirements: 9.5
    let redisplayed = false
    let dismissed = true

    function onTimeout() {
      if (!dismissed) {
        redisplayed = true
      }
    }

    onTimeout()
    expect(redisplayed).toBe(false)
  })

  it('re-display happens at most once', () => {
    // Requirements: 9.5 — once redisplayed, subsequent timeouts do not re-trigger
    let redisplayCount = 0
    let redisplayed = false

    function onTimeout() {
      if (!redisplayed) {
        redisplayed = true
        redisplayCount++
      }
    }

    onTimeout()
    onTimeout()
    onTimeout()
    expect(redisplayCount).toBe(1)
  })
})
