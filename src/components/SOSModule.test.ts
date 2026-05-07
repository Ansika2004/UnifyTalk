/**
 * Unit tests for SOS_Module pure logic.
 * Requirements: 1.2, 1.3, 1.6, 1.7
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  dispatchWithRetry,
  buildSOSAlert,
  holdMeetsTriggerThreshold,
  SOS_HOLD_THRESHOLD_MS,
} from '../services/sosService'

// ─── dispatchWithRetry ────────────────────────────────────────────────────────

describe('dispatchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('succeeds on first try — retryCount is 0', async () => {
    // Requirements: 1.6
    const dispatchFn = vi.fn().mockResolvedValue(undefined)

    const promise = dispatchWithRetry(dispatchFn, 3, 500)
    // No delays needed — resolves immediately
    const retryCount = await promise

    expect(retryCount).toBe(0)
    expect(dispatchFn).toHaveBeenCalledTimes(1)
  })

  it('fails twice then succeeds — retryCount is 2', async () => {
    // Requirements: 1.6
    const dispatchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue(undefined)

    const promise = dispatchWithRetry(dispatchFn, 3, 1)

    // Advance timers to allow retries
    await vi.runAllTimersAsync()
    const retryCount = await promise

    expect(retryCount).toBe(2)
    expect(dispatchFn).toHaveBeenCalledTimes(3)
  })

  it('fails 3 times — throws after max retries', async () => {
    // Requirements: 1.6
    const error = new Error('always fails')
    const dispatchFn = vi.fn().mockRejectedValue(error)

    let caught: Error | null = null
    const promise = dispatchWithRetry(dispatchFn, 3, 1).catch((e: Error) => {
      caught = e
    })
    await vi.runAllTimersAsync()
    await promise

    expect(caught).not.toBeNull()
    expect((caught as unknown as Error).message).toBe('always fails')
    // Called: attempt 0, retry 1, retry 2, retry 3 = 4 total
    expect(dispatchFn).toHaveBeenCalledTimes(4)
  })

  it('uses exponential backoff delays', async () => {
    // Requirements: 1.6
    const dispatchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(undefined)

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const promise = dispatchWithRetry(dispatchFn, 3, 500)
    await vi.runAllTimersAsync()
    await promise

    // First retry delay: 500ms (500 * 2^0)
    // Second retry delay: 1000ms (500 * 2^1)
    const delays = setTimeoutSpy.mock.calls
      .map((call) => call[1] as number)
      .filter((d) => d === 500 || d === 1000)

    expect(delays).toContain(500)
    expect(delays).toContain(1000)
  })
})

// ─── holdMeetsTriggerThreshold ────────────────────────────────────────────────

describe('holdMeetsTriggerThreshold', () => {
  it('2000ms triggers SOS', () => {
    // Requirements: 1.3
    expect(holdMeetsTriggerThreshold(2000)).toBe(true)
  })

  it('1999ms does NOT trigger SOS', () => {
    // Requirements: 1.3
    expect(holdMeetsTriggerThreshold(1999)).toBe(false)
  })

  it('SOS_HOLD_THRESHOLD_MS constant is 2000', () => {
    // Requirements: 1.3
    expect(SOS_HOLD_THRESHOLD_MS).toBe(2000)
  })

  it('values above threshold also trigger', () => {
    expect(holdMeetsTriggerThreshold(3000)).toBe(true)
    expect(holdMeetsTriggerThreshold(2001)).toBe(true)
  })

  it('values below threshold do not trigger', () => {
    expect(holdMeetsTriggerThreshold(0)).toBe(false)
    expect(holdMeetsTriggerThreshold(1000)).toBe(false)
    expect(holdMeetsTriggerThreshold(1998)).toBe(false)
  })
})

// ─── buildSOSAlert ────────────────────────────────────────────────────────────

describe('buildSOSAlert', () => {
  it('has all required audit log fields', () => {
    // Requirements: 1.7
    const alert = buildSOSAlert('patient-123', 'ward-A', "I can't breathe")

    expect(alert).toMatchObject({
      patientId: 'patient-123',
      wardId: 'ward-A',
      selectedMessage: "I can't breathe",
      deliveryStatus: 'pending',
      retryCount: 0,
    })
  })

  it('patientId is set correctly', () => {
    // Requirements: 1.7
    const alert = buildSOSAlert('p-456', 'ward-B', 'I need water')
    expect(alert.patientId).toBe('p-456')
  })

  it('wardId is set correctly', () => {
    // Requirements: 1.7
    const alert = buildSOSAlert('p-1', 'ward-ICU', 'I feel dizzy')
    expect(alert.wardId).toBe('ward-ICU')
  })

  it('selectedMessage is set correctly', () => {
    // Requirements: 1.7
    const alert = buildSOSAlert('p-1', 'w-1', 'Call my family')
    expect(alert.selectedMessage).toBe('Call my family')
  })

  it('initial deliveryStatus is pending', () => {
    // Requirements: 1.2
    const alert = buildSOSAlert('p-1', 'w-1', 'I need pain relief')
    expect(alert.deliveryStatus).toBe('pending')
  })

  it('initial retryCount is 0', () => {
    // Requirements: 1.6
    const alert = buildSOSAlert('p-1', 'w-1', 'I need pain relief')
    expect(alert.retryCount).toBe(0)
  })
})
