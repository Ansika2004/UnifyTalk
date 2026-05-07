/**
 * Pure logic functions for Calm_Corner.
 * Requirements: 15.5, 15.6
 */

/**
 * Convert sleep timer minutes to milliseconds.
 * Requirements: 15.5
 */
export function computeSleepTimerMs(minutes: 15 | 30 | 60): number {
  return minutes * 60 * 1000
}

/**
 * Returns true if the sleep timer has expired.
 * Requirements: 15.5
 */
export function isSleepTimerExpired(
  startedAt: number,
  durationMs: number,
  now: number,
): boolean {
  return now - startedAt >= durationMs
}
