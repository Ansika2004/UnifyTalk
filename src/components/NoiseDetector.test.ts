/**
 * Unit tests for noise threshold state machine (pure logic).
 * Requirements: 8.1, 8.2, 8.3
 */
import { describe, it, expect } from 'vitest'
import {
  computeNoiseLevel,
  CONSECUTIVE_HIGH_FOR_TOUCH,
  CONSECUTIVE_LOW_FOR_VOICE,
  HIGH_NOISE_THRESHOLD_DB,
  LOW_NOISE_THRESHOLD_DB,
} from './noiseThreshold'

// ─── computeNoiseLevel ────────────────────────────────────────────────────────

describe('computeNoiseLevel', () => {
  it('returns green for dB below 55', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(54)).toBe('green')
    expect(computeNoiseLevel(0)).toBe('green')
    expect(computeNoiseLevel(30)).toBe('green')
  })

  it('returns yellow at exactly 55 dB (lower boundary)', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(55)).toBe('yellow')
  })

  it('returns yellow at exactly 65 dB (upper boundary)', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(65)).toBe('yellow')
  })

  it('returns red for dB above 65', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(66)).toBe('red')
    expect(computeNoiseLevel(90)).toBe('red')
  })

  it('boundary: 54 dB is green, 55 dB is yellow', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(54)).toBe('green')
    expect(computeNoiseLevel(55)).toBe('yellow')
  })

  it('boundary: 65 dB is yellow, 66 dB is red', () => {
    // Requirements: 8.4
    expect(computeNoiseLevel(65)).toBe('yellow')
    expect(computeNoiseLevel(66)).toBe('red')
  })
})

// ─── consecutive-sample counter logic ────────────────────────────────────────

describe('consecutive-sample counter for touch mode switch', () => {
  it('switches to touch mode after 3 consecutive samples above 65 dB', () => {
    // Requirements: 8.2
    let consecutiveHigh = 0
    let mode: 'voice' | 'touch' = 'voice'

    const samples = [70, 72, 68] // all > 65

    for (const db of samples) {
      if (db > HIGH_NOISE_THRESHOLD_DB) {
        consecutiveHigh += 1
      } else {
        consecutiveHigh = 0
      }
      if (consecutiveHigh >= CONSECUTIVE_HIGH_FOR_TOUCH) {
        mode = 'touch'
      }
    }

    expect(mode).toBe('touch')
    expect(consecutiveHigh).toBe(CONSECUTIVE_HIGH_FOR_TOUCH)
  })

  it('does NOT switch to touch mode if high samples are not consecutive', () => {
    // Requirements: 8.2
    let consecutiveHigh = 0
    let mode: 'voice' | 'touch' = 'voice'

    const samples = [70, 50, 70, 50, 70] // alternating

    for (const db of samples) {
      if (db > HIGH_NOISE_THRESHOLD_DB) {
        consecutiveHigh += 1
      } else {
        consecutiveHigh = 0
      }
      if (consecutiveHigh >= CONSECUTIVE_HIGH_FOR_TOUCH) {
        mode = 'touch'
      }
    }

    expect(mode).toBe('voice')
  })

  it('resets consecutive counter when a low sample interrupts', () => {
    // Requirements: 8.2
    let consecutiveHigh = 0

    const samples = [70, 72, 50, 68, 70] // reset at index 2

    for (const db of samples) {
      if (db > HIGH_NOISE_THRESHOLD_DB) {
        consecutiveHigh += 1
      } else {
        consecutiveHigh = 0
      }
    }

    // After reset at 50, only 2 more high samples → counter = 2
    expect(consecutiveHigh).toBe(2)
  })
})

describe('consecutive-sample counter for voice re-enable', () => {
  it('shows voice prompt after 5 consecutive samples below 55 dB', () => {
    // Requirements: 8.3
    let consecutiveLow = 0
    let voicePromptShown = false

    const samples = [40, 42, 38, 45, 50] // all < 55

    for (const db of samples) {
      if (db < LOW_NOISE_THRESHOLD_DB) {
        consecutiveLow += 1
      } else {
        consecutiveLow = 0
      }
      if (consecutiveLow >= CONSECUTIVE_LOW_FOR_VOICE) {
        voicePromptShown = true
      }
    }

    expect(voicePromptShown).toBe(true)
  })

  it('does NOT show voice prompt if fewer than 5 consecutive low samples', () => {
    // Requirements: 8.3
    let consecutiveLow = 0
    let voicePromptShown = false

    const samples = [40, 42, 38, 60] // reset at index 3

    for (const db of samples) {
      if (db < LOW_NOISE_THRESHOLD_DB) {
        consecutiveLow += 1
      } else {
        consecutiveLow = 0
      }
      if (consecutiveLow >= CONSECUTIVE_LOW_FOR_VOICE) {
        voicePromptShown = true
      }
    }

    expect(voicePromptShown).toBe(false)
  })
})
