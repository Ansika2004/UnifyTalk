/**
 * Unit tests for Eye_Gaze_Controller pure logic.
 * Requirements: 10.2, 10.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectDoubleBlink, detectSustainedGaze } from './eyeGazeLogic'

// ─── detectDoubleBlink ────────────────────────────────────────────────────────

describe('detectDoubleBlink', () => {
  it('returns true when 2 blinks occur within 600ms', () => {
    // Requirements: 10.2
    const now = 1000
    const history = [now, now + 400] // 400ms apart — within 600ms window
    expect(detectDoubleBlink(history, 600)).toBe(true)
  })

  it('returns false when only 1 blink in history', () => {
    // Requirements: 10.2
    expect(detectDoubleBlink([1000], 600)).toBe(false)
  })

  it('returns false when 2 blinks are more than 600ms apart', () => {
    // Requirements: 10.2
    const history = [1000, 1700] // 700ms apart — outside 600ms window
    expect(detectDoubleBlink(history, 600)).toBe(false)
  })

  it('returns false for empty history', () => {
    expect(detectDoubleBlink([], 600)).toBe(false)
  })

  it('boundary: exactly 600ms apart returns true (≤ windowMs)', () => {
    // Requirements: 10.2 — boundary at exactly 600ms
    const history = [1000, 1600] // exactly 600ms
    expect(detectDoubleBlink(history, 600)).toBe(true)
  })

  it('boundary: 601ms apart returns false', () => {
    // Requirements: 10.2
    const history = [1000, 1601]
    expect(detectDoubleBlink(history, 600)).toBe(false)
  })

  it('returns true when 3 blinks are present and 2 are within window', () => {
    // Requirements: 10.2 — only need any 2 consecutive within window
    const history = [1000, 2000, 2300] // 2000→2300 = 300ms apart
    expect(detectDoubleBlink(history, 600)).toBe(true)
  })

  it('handles unsorted blink history', () => {
    // Requirements: 10.2 — history may not be sorted
    const history = [1400, 1000] // unsorted; 400ms apart
    expect(detectDoubleBlink(history, 600)).toBe(true)
  })
})

// ─── detectSustainedGaze ──────────────────────────────────────────────────────

describe('detectSustainedGaze', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when gaze held for ≥1000ms', () => {
    // Requirements: 10.3
    const startTime = Date.now()
    vi.advanceTimersByTime(1000)
    expect(detectSustainedGaze('left', startTime, 1000)).toBe(true)
  })

  it('returns false when gaze held for 999ms (below threshold)', () => {
    // Requirements: 10.3
    const startTime = Date.now()
    vi.advanceTimersByTime(999)
    expect(detectSustainedGaze('left', startTime, 1000)).toBe(false)
  })

  it('returns false when gazeDirection is null', () => {
    // Requirements: 10.3
    const startTime = Date.now()
    vi.advanceTimersByTime(2000)
    expect(detectSustainedGaze(null, startTime, 1000)).toBe(false)
  })

  it('returns false when gazeStartTime is null', () => {
    // Requirements: 10.3
    expect(detectSustainedGaze('right', null, 1000)).toBe(false)
  })

  it('boundary: exactly 1000ms returns true', () => {
    // Requirements: 10.3 — boundary at exactly 1000ms
    const startTime = Date.now()
    vi.advanceTimersByTime(1000)
    expect(detectSustainedGaze('right', startTime, 1000)).toBe(true)
  })

  it('direction change resets — new startTime means false', () => {
    // Requirements: 10.3 — when direction changes, caller resets gazeStartTime
    // Simulate: gaze was 'left' for 800ms, then changed to 'right' (new startTime)
    vi.advanceTimersByTime(800)
    const newStartTime = Date.now() // direction changed, reset start
    vi.advanceTimersByTime(200) // only 200ms in new direction
    expect(detectSustainedGaze('right', newStartTime, 1000)).toBe(false)
  })

  it('works for center direction', () => {
    // Requirements: 10.3
    const startTime = Date.now()
    vi.advanceTimersByTime(1500)
    expect(detectSustainedGaze('center', startTime, 1000)).toBe(true)
  })
})
