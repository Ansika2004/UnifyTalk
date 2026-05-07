/**
 * Pure logic functions for Medication_Reminder.
 * Requirements: 9.5, 9.6
 */
import type { DoseEvent } from '../types'
import type { Timestamp } from 'firebase/firestore'

/**
 * Compute dose status based on whether the patient took the medication.
 * - 'taken': takenAt is set (regardless of timing)
 * - 'missed': takenAt is null and elapsed time >= timeoutMs
 * - 'pending': takenAt is null and elapsed time < timeoutMs
 * Requirements: 9.5
 */
export function computeDoseStatus(
  takenAt: number | null,
  scheduledAt: number,
  timeoutMs: number,
): 'taken' | 'missed' | 'pending' {
  if (takenAt !== null) return 'taken'
  const elapsed = Date.now() - scheduledAt
  return elapsed >= timeoutMs ? 'missed' : 'pending'
}

/**
 * Build a DoseEvent object (without confirmedAt) for Firestore writes.
 * Requirements: 9.5
 */
export function buildDoseEvent(
  medicationId: string,
  patientId: string,
  scheduledTime: Timestamp,
  status: DoseEvent['status'],
): Omit<DoseEvent, 'confirmedAt'> {
  return {
    medicationId,
    patientId,
    scheduledTime,
    status,
  }
}
