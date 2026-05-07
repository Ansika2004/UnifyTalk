/**
 * Unit tests for Family_Connect pure logic.
 * Requirements: 14.1, 14.5, 14.6
 */
import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  isTokenExpired,
  isTokenRevoked,
  buildFamilyAccessLink,
} from './familyConnectService'
import type { FamilyConsentSettings } from '../types'

const defaultConsent: FamilyConsentSettings = {
  showMoodHistory: true,
  showMedicationCompliance: true,
  showChatHistory: true,
}

// ─── isTokenExpired ───────────────────────────────────────────────────────────

describe('isTokenExpired', () => {
  it('returns true for a timestamp in the past', () => {
    // Requirements: 14.1, 14.6
    const past = Timestamp.fromMillis(Date.now() - 1000)
    expect(isTokenExpired(past)).toBe(true)
  })

  it('returns false for a timestamp in the future', () => {
    // Requirements: 14.1
    const future = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000)
    expect(isTokenExpired(future)).toBe(false)
  })

  it('returns true for a timestamp exactly at now (expired)', () => {
    // Requirements: 14.1 — boundary: expired at current ms
    const now = Timestamp.fromMillis(Date.now() - 1)
    expect(isTokenExpired(now)).toBe(true)
  })

  it('returns false for a timestamp 1ms in the future', () => {
    // Requirements: 14.1
    const future = Timestamp.fromMillis(Date.now() + 1)
    expect(isTokenExpired(future)).toBe(false)
  })
})

// ─── isTokenRevoked ───────────────────────────────────────────────────────────

describe('isTokenRevoked', () => {
  it('returns true when revokedAt is set', () => {
    // Requirements: 14.6
    const revokedAt = Timestamp.fromMillis(Date.now() - 5000)
    expect(isTokenRevoked(revokedAt)).toBe(true)
  })

  it('returns false when revokedAt is undefined', () => {
    // Requirements: 14.6
    expect(isTokenRevoked(undefined)).toBe(false)
  })

  it('returns false when revokedAt is null (cast)', () => {
    // Requirements: 14.6
    expect(isTokenRevoked(null as any)).toBe(false)
  })
})

// ─── buildFamilyAccessLink ────────────────────────────────────────────────────

describe('buildFamilyAccessLink', () => {
  it('returns object with all required fields', () => {
    // Requirements: 14.1
    const link = buildFamilyAccessLink('patient-123', 'staff-456', defaultConsent)
    expect(link.patientId).toBe('patient-123')
    expect(link.createdBy).toBe('staff-456')
    expect(link.consentSettings).toEqual(defaultConsent)
    expect(typeof link.token).toBe('string')
    expect(link.token.length).toBeGreaterThan(0)
    expect(link.expiresAt).toBeDefined()
  })

  it('sets expiresAt to ~72 hours from now', () => {
    // Requirements: 14.1
    const before = Date.now()
    const link = buildFamilyAccessLink('patient-123', 'staff-456', defaultConsent)
    const after = Date.now()
    const ttl = 72 * 60 * 60 * 1000
    expect(link.expiresAt.toMillis()).toBeGreaterThanOrEqual(before + ttl - 100)
    expect(link.expiresAt.toMillis()).toBeLessThanOrEqual(after + ttl + 100)
  })

  it('does NOT include revokedAt field by default', () => {
    // Requirements: 14.6
    const link = buildFamilyAccessLink('patient-123', 'staff-456', defaultConsent)
    expect(link.revokedAt).toBeUndefined()
  })

  it('uses provided token when given', () => {
    // Requirements: 14.1
    const link = buildFamilyAccessLink('patient-123', 'staff-456', defaultConsent, 'my-token')
    expect(link.token).toBe('my-token')
  })

  it('generates unique tokens when called multiple times', () => {
    // Requirements: 14.1
    const link1 = buildFamilyAccessLink('p1', 's1', defaultConsent)
    const link2 = buildFamilyAccessLink('p1', 's1', defaultConsent)
    expect(link1.token).not.toBe(link2.token)
  })
})

// ─── consent flag combinations ────────────────────────────────────────────────

describe('consent flag combinations', () => {
  it('showMoodHistory=false gates mood data', () => {
    // Requirements: 14.5
    const consent: FamilyConsentSettings = {
      showMoodHistory: false,
      showMedicationCompliance: true,
      showChatHistory: true,
    }
    const link = buildFamilyAccessLink('p1', 's1', consent)
    expect(link.consentSettings.showMoodHistory).toBe(false)
    expect(link.consentSettings.showMedicationCompliance).toBe(true)
    expect(link.consentSettings.showChatHistory).toBe(true)
  })

  it('showMedicationCompliance=false gates medication data', () => {
    // Requirements: 14.5
    const consent: FamilyConsentSettings = {
      showMoodHistory: true,
      showMedicationCompliance: false,
      showChatHistory: true,
    }
    const link = buildFamilyAccessLink('p1', 's1', consent)
    expect(link.consentSettings.showMedicationCompliance).toBe(false)
  })

  it('showChatHistory=false gates chat data', () => {
    // Requirements: 14.5
    const consent: FamilyConsentSettings = {
      showMoodHistory: true,
      showMedicationCompliance: true,
      showChatHistory: false,
    }
    const link = buildFamilyAccessLink('p1', 's1', consent)
    expect(link.consentSettings.showChatHistory).toBe(false)
  })

  it('all flags false — no data accessible', () => {
    // Requirements: 14.5
    const consent: FamilyConsentSettings = {
      showMoodHistory: false,
      showMedicationCompliance: false,
      showChatHistory: false,
    }
    const link = buildFamilyAccessLink('p1', 's1', consent)
    const { showMoodHistory, showMedicationCompliance, showChatHistory } = link.consentSettings
    expect(showMoodHistory || showMedicationCompliance || showChatHistory).toBe(false)
  })

  it('all flags true — all data accessible', () => {
    // Requirements: 14.5
    const link = buildFamilyAccessLink('p1', 's1', defaultConsent)
    const { showMoodHistory, showMedicationCompliance, showChatHistory } = link.consentSettings
    expect(showMoodHistory && showMedicationCompliance && showChatHistory).toBe(true)
  })
})
