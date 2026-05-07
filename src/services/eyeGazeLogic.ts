/**
 * Pure logic functions for Eye_Gaze_Controller.
 * Requirements: 10.2, 10.3, 10.4
 */

/**
 * Returns true if there are at least 2 blinks within the given windowMs.
 * blinkHistory is an array of timestamps (ms) of recent blinks.
 * Requirements: 10.2
 */
export function detectDoubleBlink(blinkHistory: number[], windowMs: number): boolean {
  if (blinkHistory.length < 2) return false
  const sorted = [...blinkHistory].sort((a, b) => a - b)
  // Check any consecutive pair within windowMs
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= windowMs) return true
  }
  return false
}

/**
 * Returns true if the same gaze direction has been held for at least thresholdMs.
 * gazeDirection: current direction; gazeStartTime: when this direction started (ms timestamp).
 * Requirements: 10.3
 */
export function detectSustainedGaze(
  gazeDirection: 'left' | 'right' | 'center' | null,
  gazeStartTime: number | null,
  thresholdMs: number,
): boolean {
  if (gazeDirection === null || gazeStartTime === null) return false
  return Date.now() - gazeStartTime >= thresholdMs
}
