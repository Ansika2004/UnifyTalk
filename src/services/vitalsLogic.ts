/**
 * Pure logic functions for Vitals_Dashboard.
 * Requirements: 12.2, 12.3, 12.6
 */
import type { VitalReading } from '../types'

/**
 * Compute vital status based on value and normal range.
 * - 'normal': value within [min, max]
 * - 'warning': value outside normal range by ≤10%
 * - 'critical': value outside normal range by >10%
 * Requirements: 12.2
 */
export function computeVitalStatus(
  value: number,
  normalRange: [number, number],
): 'normal' | 'warning' | 'critical' {
  const [min, max] = normalRange

  if (value >= min && value <= max) return 'normal'

  // Compute how far outside the range the value is, as a percentage of the range width
  const rangeWidth = max - min

  if (value < min) {
    const deviation = (min - value) / rangeWidth
    if (deviation <= 0.1) return 'warning'
    return 'critical'
  } else {
    // value > max
    const deviation = (value - max) / rangeWidth
    if (deviation <= 0.1) return 'warning'
    return 'critical'
  }
}

/**
 * Get a reassuring plain-language label for a vital reading.
 * Only returns a non-empty string for 'normal' status.
 * Requirements: 12.3
 */
export function getReassuranceLabel(
  type: VitalReading['type'],
  value: number,
  status: 'normal' | 'warning' | 'critical',
): string {
  if (status !== 'normal') return ''

  switch (type) {
    case 'heart_rate':
      return `Your heart rate is ${value} bpm — that's great`
    case 'spo2':
      return `Your oxygen is ${value}% — that's great`
    case 'temperature':
      return `Your temperature is ${value}°C — that's normal`
    default:
      return `Your reading is ${value} — that's normal`
  }
}
