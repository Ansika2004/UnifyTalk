/**
 * Pure noise threshold logic — extracted for testability.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

/**
 * Map a dB reading to a noise level color.
 * - green:  < 55 dB
 * - yellow: 55–65 dB (inclusive)
 * - red:    > 65 dB
 */
export function computeNoiseLevel(db: number): 'green' | 'yellow' | 'red' {
  if (db > 65) return 'red'
  if (db >= 55) return 'yellow'
  return 'green'
}

export const CONSECUTIVE_HIGH_FOR_TOUCH = 3
export const CONSECUTIVE_LOW_FOR_VOICE = 5
export const HIGH_NOISE_THRESHOLD_DB = 65
export const LOW_NOISE_THRESHOLD_DB = 55
