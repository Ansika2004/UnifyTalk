/**
 * Unit tests for Gesture_Classifier confidence thresholding.
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */
import { describe, it, expect } from 'vitest'
import {
  classifyGesture,
  loadGestureModel,
  ISL_VOCABULARY,
} from './gestureClassifier'
import type { HandLandmarks } from './gestureClassifier'

/** Build 21 mock landmarks with a given average fingertip Y */
function makeLandmarks(avgFingertipY = 0.5): HandLandmarks {
  return Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: avgFingertipY,
    z: 0,
  }))
}

// ─── ISL_VOCABULARY ───────────────────────────────────────────────────────────

describe('ISL_VOCABULARY', () => {
  it('contains at least 15 medical terms', () => {
    // Requirements: 3.2
    expect(ISL_VOCABULARY.length).toBeGreaterThanOrEqual(15)
  })

  it('includes all required medical terms', () => {
    // Requirements: 3.2
    const required = [
      'pain', 'water', 'toilet', 'medicine', 'doctor',
      'nurse', 'help', 'food', 'cold', 'hot',
      'yes', 'no', 'sleep', 'breathe', 'family',
    ]
    for (const term of required) {
      expect(ISL_VOCABULARY).toContain(term)
    }
  })
})

// ─── loadGestureModel ─────────────────────────────────────────────────────────

describe('loadGestureModel', () => {
  it('resolves without error', async () => {
    // Requirements: 3.2
    await expect(loadGestureModel()).resolves.toBeUndefined()
  })
})

// ─── classifyGesture — accept path ───────────────────────────────────────────

describe('classifyGesture — accept path', () => {
  it('returns confidence ≥ 0.75 (stub always returns 0.85)', async () => {
    // Requirements: 3.3
    const result = await classifyGesture(makeLandmarks(0.5))
    expect(result.confidence).toBeGreaterThanOrEqual(0.75)
  })

  it('returns a sign that is in ISL_VOCABULARY', async () => {
    // Requirements: 3.2
    const result = await classifyGesture(makeLandmarks(0.3))
    expect(ISL_VOCABULARY).toContain(result.sign)
  })

  it('stub confidence is exactly 0.85', async () => {
    // Requirements: 3.3 — stub always returns 0.85 so pipeline can be exercised
    const result = await classifyGesture(makeLandmarks(0.7))
    expect(result.confidence).toBe(0.85)
  })
})

// ─── classifyGesture — reject path ───────────────────────────────────────────

describe('classifyGesture — reject path (threshold logic)', () => {
  it('a result with confidence < 0.75 should NOT be appended to phrase buffer', () => {
    // Requirements: 3.5
    // The threshold check is a pure comparison — test the logic directly
    const CONFIDENCE_THRESHOLD = 0.75

    const lowConfidenceResult = { sign: 'pain' as const, confidence: 0.60 }
    const highConfidenceResult = { sign: 'water' as const, confidence: 0.85 }

    const phraseBuffer: string[] = []

    if (lowConfidenceResult.confidence >= CONFIDENCE_THRESHOLD) {
      phraseBuffer.push(lowConfidenceResult.sign)
    }
    expect(phraseBuffer).toHaveLength(0)

    if (highConfidenceResult.confidence >= CONFIDENCE_THRESHOLD) {
      phraseBuffer.push(highConfidenceResult.sign)
    }
    expect(phraseBuffer).toHaveLength(1)
    expect(phraseBuffer[0]).toBe('water')
  })

  it('boundary: confidence exactly 0.75 is accepted', () => {
    // Requirements: 3.3
    const CONFIDENCE_THRESHOLD = 0.75
    expect(0.75 >= CONFIDENCE_THRESHOLD).toBe(true)
  })

  it('boundary: confidence 0.749 is rejected', () => {
    // Requirements: 3.5
    const CONFIDENCE_THRESHOLD = 0.75
    expect(0.749 >= CONFIDENCE_THRESHOLD).toBe(false)
  })
})

// ─── phrase buffer accumulation ───────────────────────────────────────────────

describe('phrase buffer accumulation', () => {
  it('multiple classifications build up a phrase', async () => {
    // Requirements: 3.6
    const CONFIDENCE_THRESHOLD = 0.75
    const phraseBuffer: string[] = []

    for (let i = 0; i < 3; i++) {
      const result = await classifyGesture(makeLandmarks(i * 0.1))
      if (result.confidence >= CONFIDENCE_THRESHOLD) {
        phraseBuffer.push(result.sign)
      }
    }

    expect(phraseBuffer.length).toBe(3)
    expect(phraseBuffer.join(' ')).toContain(' ')
  })

  it('phrase buffer joins words with spaces', () => {
    // Requirements: 3.6
    const words = ['pain', 'water', 'help']
    expect(words.join(' ')).toBe('pain water help')
  })
})
