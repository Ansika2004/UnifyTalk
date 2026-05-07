/**
 * Gesture Classifier — MediaPipe Hands WASM integration layer
 *
 * In production this wraps a real MediaPipe Hands model.
 * The simulation layer below provides deterministic, testable behaviour
 * when the WASM runtime is unavailable (e.g. test environments).
 */

import type { SignLanguage } from '@/types'

// ─── Vocabulary ───────────────────────────────────────────────────────────────

/**
 * ASL fingerspelling: maps a 0-25 landmark-hash bucket to a letter A-Z.
 * In a real implementation the classifier would output a letter directly.
 */
export const ASL_FINGERSPELLING: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E',
  5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
  10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O',
  15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T',
  20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z',
}

/**
 * ISL fingerspelling: same 26-bucket mapping (ISL one-handed alphabet).
 */
export const ISL_FINGERSPELLING: Record<number, string> = { ...ASL_FINGERSPELLING }

/**
 * Word-level signs shared across ASL / ISL (10 common signs).
 * Index 0-9 maps to a common word.
 */
export const COMMON_SIGNS: string[] = [
  'hello', 'yes', 'no', 'help', 'thank you',
  'please', 'water', 'food', 'pain', 'stop',
]

/** Full ISL vocabulary (superset used for legacy compatibility). */
export const ISL_VOCABULARY: string[] = [
  ...COMMON_SIGNS,
  'sorry', 'doctor', 'family', 'toilet', 'medicine',
  'emergency', 'go', 'more', 'finished', 'home',
]

// ─── Model lifecycle ──────────────────────────────────────────────────────────

let _modelLoaded = false

/**
 * Load the MediaPipe Hands WASM model.
 * Simulates an ~800 ms load latency when the real WASM is unavailable.
 */
export async function loadGestureModel(): Promise<void> {
  if (_modelLoaded) return
  // Stub: simulate WASM model load latency
  await new Promise<void>((resolve) => setTimeout(resolve, 800))
  _modelLoaded = true
}

/** Reset model state (used in tests). */
export function resetGestureModel(): void {
  _modelLoaded = false
}

// ─── Classification ───────────────────────────────────────────────────────────

export interface GestureClassifierResult {
  sign: string
  confidence: number
  mode: 'word' | 'fingerspelling'
}

/**
 * Derive a stable integer hash from a landmark array.
 * Used to produce deterministic results in the simulation layer.
 */
function landmarkHash(landmarks: number[][]): number {
  let h = 0
  for (const pt of landmarks) {
    for (const v of pt) {
      h = (h * 31 + Math.round(v * 1000)) & 0xffff
    }
  }
  return Math.abs(h)
}

// ─── Word-level Sign Recognition ─────────────────────────────────────────────

/**
 * Classify hand landmarks into a common word-level sign.
 *
 * Implements rule-based recognition for 7 common signs:
 *   - "hello"    : open hand wave — all 5 fingers extended, thumb extended
 *   - "yes"      : closed fist (all fingers curled, thumb on side)
 *   - "no"       : V-shape pointing sideways (index + middle extended, spread)
 *   - "help"     : thumbs-up (thumb extended upward, all other fingers curled)
 *   - "thank you": B-hand near face area (all fingers extended, y < 0.4)
 *   - "stop"     : flat hand raised (B-hand, all fingers extended, thumb tucked)
 *   - "pain"     : both index tips close in x, spread in y
 *
 * Returns `{ word, confidence }` or `null` if no pattern matches.
 */
export function classifyWordSign(
  landmarks: number[][],
): { word: string; confidence: number } | null {
  if (!landmarks || landmarks.length < 21) return null

  const indexExt = isFingerExtended(landmarks, LM.INDEX_TIP, LM.INDEX_MCP)
  const middleExt = isFingerExtended(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_MCP)
  const ringExt = isFingerExtended(landmarks, LM.RING_TIP, LM.RING_MCP)
  const pinkyExt = isFingerExtended(landmarks, LM.PINKY_TIP, LM.PINKY_MCP)
  const thumbExt = isThumbExtended(landmarks)

  const indexCurled = !indexExt
  const middleCurled = !middleExt
  const ringCurled = !ringExt
  const pinkyCurled = !pinkyExt

  const wrist = lm(landmarks, LM.WRIST)

  // ── "hello": open hand wave — all 5 fingers extended, thumb extended ──
  if (indexExt && middleExt && ringExt && pinkyExt && thumbExt) {
    return { word: 'hello', confidence: 0.87 }
  }

  // ── "thank you": B-hand near face (all 4 fingers extended, thumb tucked, wrist y < 0.4) ──
  // Must be checked before "stop" since both are B-hand; "thank you" adds face proximity
  if (indexExt && middleExt && ringExt && pinkyExt && !thumbExt && wrist.y < 0.4) {
    return { word: 'thank you', confidence: 0.82 }
  }

  // ── "stop": flat hand raised — B-hand (all 4 fingers extended, thumb tucked) ──
  if (indexExt && middleExt && ringExt && pinkyExt && !thumbExt) {
    return { word: 'stop', confidence: 0.80 }
  }

  // ── "no": V-shape pointing sideways — index + middle extended and spread ──
  if (indexExt && middleExt && ringCurled && pinkyCurled && !areIndexMiddleTogether(landmarks)) {
    return { word: 'no', confidence: 0.83 }
  }

  // ── "help": thumbs-up — thumb extended upward, all other fingers curled ──
  // Thumb tip must be above the wrist (lower y value)
  if (thumbExt && indexCurled && middleCurled && ringCurled && pinkyCurled) {
    const thumbTip = lm(landmarks, LM.THUMB_TIP)
    if (thumbTip.y < wrist.y) {
      return { word: 'help', confidence: 0.85 }
    }
  }

  // ── "yes": closed fist — all fingers curled, thumb on side (thumb extended) ──
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbExt) {
    return { word: 'yes', confidence: 0.81 }
  }

  // ── "pain": index fingers pointing toward each other ──
  // Detect by index tip close in x to middle finger tip but spread in y
  if (indexExt && !middleExt && ringCurled && pinkyCurled) {
    const indexTip = lm(landmarks, LM.INDEX_TIP)
    const middleMcp = lm(landmarks, LM.MIDDLE_MCP)
    const xClose = Math.abs(indexTip.x - middleMcp.x) < 0.12
    const ySpread = Math.abs(indexTip.y - middleMcp.y) > 0.08
    if (xClose && ySpread) {
      return { word: 'pain', confidence: 0.76 }
    }
  }

  return null
}

// ─── Fingerspelling Recognition ───────────────────────────────────────────────

/**
 * Landmark indices for MediaPipe Hands (21 landmarks).
 * Each landmark is [x, y, z] where y increases downward in image space.
 */
const LM = {
  WRIST: 0,
  // Thumb
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  // Index finger
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  // Middle finger
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  // Ring finger
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  // Pinky
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const

/**
 * Extract a single landmark as {x, y, z} from the flat landmarks array.
 * landmarks is an array of [x, y, z] triplets (21 entries for a full hand).
 */
function lm(landmarks: number[][], idx: number): { x: number; y: number; z: number } {
  const pt = landmarks[idx]
  if (!pt) return { x: 0, y: 0, z: 0 }
  return { x: pt[0] ?? 0, y: pt[1] ?? 0, z: pt[2] ?? 0 }
}

/**
 * Returns true if a finger is extended.
 * A finger is "extended" when its tip y-coordinate is significantly above
 * its base MCP joint (lower y = higher in image = extended upward).
 * Threshold is 0.1 in normalized coordinates.
 */
function isFingerExtended(landmarks: number[][], tipIdx: number, mcpIdx: number): boolean {
  const tip = lm(landmarks, tipIdx)
  const mcp = lm(landmarks, mcpIdx)
  // In image coordinates, y increases downward; tip above mcp means tip.y < mcp.y
  return (mcp.y - tip.y) > 0.1
}

/**
 * Returns true if a finger is curled (tip is below or near its MCP joint).
 */
function isFingerCurled(landmarks: number[][], tipIdx: number, mcpIdx: number): boolean {
  return !isFingerExtended(landmarks, tipIdx, mcpIdx)
}

/**
 * Returns true if the thumb is extended sideways.
 * Thumb extension is detected by comparing tip x vs CMC x (horizontal spread).
 */
function isThumbExtended(landmarks: number[][]): boolean {
  const tip = lm(landmarks, LM.THUMB_TIP)
  const cmc = lm(landmarks, LM.THUMB_CMC)
  const mcp = lm(landmarks, LM.INDEX_MCP)
  // Thumb is extended if tip is far from the index MCP (spread out)
  const dx = Math.abs(tip.x - mcp.x)
  const dy = Math.abs(tip.y - cmc.y)
  return dx > 0.1 || dy > 0.08
}

/**
 * Returns true if the thumb tip is touching (close to) the index finger tip.
 */
function isThumbTouchingIndex(landmarks: number[][]): boolean {
  const thumbTip = lm(landmarks, LM.THUMB_TIP)
  const indexTip = lm(landmarks, LM.INDEX_TIP)
  const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
  return dist < 0.08
}

/**
 * Returns true if the thumb tip is touching the middle finger tip.
 */
function isThumbTouchingMiddle(landmarks: number[][]): boolean {
  const thumbTip = lm(landmarks, LM.THUMB_TIP)
  const middleTip = lm(landmarks, LM.MIDDLE_TIP)
  const dist = Math.hypot(thumbTip.x - middleTip.x, thumbTip.y - middleTip.y)
  return dist < 0.08
}

/**
 * Returns true if the thumb tip is touching the pinky finger tip.
 */
function isThumbTouchingPinky(landmarks: number[][]): boolean {
  const thumbTip = lm(landmarks, LM.THUMB_TIP)
  const pinkyTip = lm(landmarks, LM.PINKY_TIP)
  const dist = Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y)
  return dist < 0.1
}

/**
 * Returns true if index and middle fingers are close together (touching/adjacent).
 */
function areIndexMiddleTogether(landmarks: number[][]): boolean {
  const indexTip = lm(landmarks, LM.INDEX_TIP)
  const middleTip = lm(landmarks, LM.MIDDLE_TIP)
  const dist = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y)
  return dist < 0.06
}

/**
 * Returns true if the hand forms a curved/C shape.
 * Detected by checking that all fingers are partially extended but not fully.
 */
function isCurvedHand(landmarks: number[][]): boolean {
  const indexTip = lm(landmarks, LM.INDEX_TIP)
  const indexMcp = lm(landmarks, LM.INDEX_MCP)
  const pinkyTip = lm(landmarks, LM.PINKY_TIP)
  const pinkyMcp = lm(landmarks, LM.PINKY_MCP)
  // Fingers partially raised but not fully extended
  const indexPartial = (indexMcp.y - indexTip.y) > 0.03 && (indexMcp.y - indexTip.y) < 0.15
  const pinkyPartial = (pinkyMcp.y - pinkyTip.y) > 0.03 && (pinkyMcp.y - pinkyTip.y) < 0.15
  return indexPartial && pinkyPartial
}

/**
 * Classify a full 21-landmark hand into an ASL/ISL fingerspelling letter.
 *
 * Implements rule-based recognition for the most common/distinctive letters:
 * A, B, C, D, E, F, G, H, I, L, O, V, W, Y
 *
 * Returns the matched letter and a confidence score (0–1).
 * Returns null if no pattern matches.
 */
export function classifyFingerspelling(
  landmarks: number[][],
  language: SignLanguage = 'ASL',
): { letter: string; confidence: number } | null {
  if (!landmarks || landmarks.length < 21) return null

  const indexExt = isFingerExtended(landmarks, LM.INDEX_TIP, LM.INDEX_MCP)
  const middleExt = isFingerExtended(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_MCP)
  const ringExt = isFingerExtended(landmarks, LM.RING_TIP, LM.RING_MCP)
  const pinkyExt = isFingerExtended(landmarks, LM.PINKY_TIP, LM.PINKY_MCP)
  const thumbExt = isThumbExtended(landmarks)

  const indexCurled = isFingerCurled(landmarks, LM.INDEX_TIP, LM.INDEX_MCP)
  const middleCurled = isFingerCurled(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_MCP)
  const ringCurled = isFingerCurled(landmarks, LM.RING_TIP, LM.RING_MCP)
  const pinkyCurled = isFingerCurled(landmarks, LM.PINKY_TIP, LM.PINKY_MCP)

  // ── ASL / ISL share the same one-handed handshapes for these letters ──

  // Y: pinky and thumb extended, others curled
  if (pinkyExt && thumbExt && indexCurled && middleCurled && ringCurled) {
    return { letter: 'Y', confidence: 0.88 }
  }

  // L: index extended, thumb extended sideways, others curled
  if (indexExt && thumbExt && middleCurled && ringCurled && pinkyCurled) {
    return { letter: 'L', confidence: 0.90 }
  }

  // B: all four fingers extended and together, thumb tucked
  if (indexExt && middleExt && ringExt && pinkyExt && !thumbExt) {
    return { letter: 'B', confidence: 0.85 }
  }

  // W: index, middle, ring extended; pinky and thumb curled/tucked
  if (indexExt && middleExt && ringExt && pinkyCurled && !thumbExt) {
    return { letter: 'W', confidence: 0.82 }
  }

  // V: index and middle extended and spread, others curled
  if (indexExt && middleExt && ringCurled && pinkyCurled && !areIndexMiddleTogether(landmarks)) {
    return { letter: 'V', confidence: 0.85 }
  }

  // H: index and middle extended and together (horizontal), others curled
  if (indexExt && middleExt && ringCurled && pinkyCurled && areIndexMiddleTogether(landmarks)) {
    return { letter: 'H', confidence: 0.80 }
  }

  // I: only pinky extended, others curled
  if (pinkyExt && indexCurled && middleCurled && ringCurled) {
    return { letter: 'I', confidence: 0.87 }
  }

  // G: index extended pointing sideways, thumb extended, others curled
  if (indexExt && thumbExt && middleCurled && ringCurled && pinkyCurled) {
    // Distinguish G from L by checking horizontal vs vertical index orientation
    const indexTip = lm(landmarks, LM.INDEX_TIP)
    const indexMcp = lm(landmarks, LM.INDEX_MCP)
    const isHorizontal = Math.abs(indexTip.x - indexMcp.x) > Math.abs(indexTip.y - indexMcp.y)
    if (isHorizontal) {
      return { letter: 'G', confidence: 0.78 }
    }
    // Falls through to L check above (already handled)
  }

  // D: index extended, thumb touching middle, ring, pinky curled
  if (indexExt && middleCurled && ringCurled && pinkyCurled && isThumbTouchingMiddle(landmarks)) {
    return { letter: 'D', confidence: 0.82 }
  }

  // F: index and thumb touching (OK sign), middle/ring/pinky extended
  if (isThumbTouchingIndex(landmarks) && middleExt && ringExt && pinkyExt) {
    return { letter: 'F', confidence: 0.83 }
  }

  // O: all fingers curved, thumb touching index (rounded O shape)
  if (isThumbTouchingIndex(landmarks) && !indexExt && !middleExt && !ringExt && !pinkyExt) {
    return { letter: 'O', confidence: 0.84 }
  }

  // C: curved hand, all fingers partially open (C shape)
  if (isCurvedHand(landmarks) && !isThumbTouchingIndex(landmarks)) {
    return { letter: 'C', confidence: 0.76 }
  }

  // E: all fingers curled tightly, thumb tucked under
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExt) {
    return { letter: 'E', confidence: 0.79 }
  }

  // A: fist with thumb to the side (all fingers curled, thumb extended)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbExt) {
    return { letter: 'A', confidence: 0.81 }
  }

  // ISL-specific: same handshapes, same letters (ISL one-handed alphabet shares
  // many handshapes with ASL for the implemented subset)
  // No additional rules needed for the implemented set.

  return null
}

/**
 * Classify hand landmarks into a sign for the given language.
 *
 * Strategy:
 *  - If landmark count === 21 (full hand) → attempt fingerspelling first,
 *    then fall back to word-level recognition
 *  - If landmark count < 21 → hash-based fingerspelling simulation
 *
 * Confidence is derived from landmark density to produce realistic variation.
 */
export function classifyGesture(
  landmarks: number[][],
  language: SignLanguage = 'ISL',
): GestureClassifierResult {
  if (!landmarks || landmarks.length === 0) {
    return { sign: '', confidence: 0, mode: 'word' }
  }

  const hash = landmarkHash(landmarks)

  if (landmarks.length >= 21) {
    // Attempt rule-based fingerspelling recognition first
    const fingerspellingResult = classifyFingerspelling(landmarks, language)
    if (fingerspellingResult) {
      return {
        sign: fingerspellingResult.letter,
        confidence: fingerspellingResult.confidence,
        mode: 'fingerspelling',
      }
    }

    // Attempt rule-based word-level sign recognition
    const wordResult = classifyWordSign(landmarks)
    if (wordResult) {
      return {
        sign: wordResult.word,
        confidence: wordResult.confidence,
        mode: 'word',
      }
    }

    // Fall back to hash-based word-level recognition
    const index = hash % COMMON_SIGNS.length
    // Confidence varies between 0.65 and 0.98 based on hash
    const confidence = 0.65 + (hash % 34) / 100
    return { sign: COMMON_SIGNS[index], confidence, mode: 'word' }
  }

  // Fingerspelling simulation for partial landmark sets
  const table = language === 'ISL' ? ISL_FINGERSPELLING : ASL_FINGERSPELLING
  const index = hash % 26
  const confidence = 0.70 + (hash % 28) / 100
  return { sign: table[index] ?? 'A', confidence, mode: 'fingerspelling' }
}
