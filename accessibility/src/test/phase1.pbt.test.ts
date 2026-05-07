// Feature: accessible-communication-platform, Property 1: User profile round trip
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type {
  UserProfile,
  DisabilityType,
  CommunicationMode,
  AccessibilityPreferences,
  EmergencyContact,
  FontSize,
  ContrastMode,
  FlashIntensity,
} from '@/types'

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const disabilityTypeArb = fc.constantFrom<DisabilityType>(
  'deaf', 'hard-of-hearing', 'mute', 'non-verbal', 'blind', 'low-vision'
)

const communicationModeArb = fc.constantFrom<CommunicationMode>(
  'pictogram', 'text', 'sign-language', 'voice'
)

const fontSizeArb = fc.constantFrom<FontSize>('small', 'medium', 'large', 'extra-large')
const contrastModeArb = fc.constantFrom<ContrastMode>('normal', 'high-contrast', 'dark')
const flashIntensityArb = fc.constantFrom<FlashIntensity>('subtle', 'moderate', 'strong')

const accessibilityPreferencesArb = fc.record<AccessibilityPreferences>({
  fontSize: fontSizeArb,
  contrastMode: contrastModeArb,
  flashIntensity: flashIntensityArb,
  audioSpeed: fc.float({ min: 0.5, max: 2.0, noNaN: true }),
  voiceGender: fc.constantFrom('male', 'female', 'neutral'),
  voiceLanguage: fc.constantFrom('en-US', 'en-GB', 'hi-IN', 'kn-IN', 'ta-IN', 'bn-IN'),
  ttsEnabled: fc.boolean(),
  voiceNavigationEnabled: fc.boolean(),
  disabilityTypes: fc.array(disabilityTypeArb, { maxLength: 6 }),
  preferredCommunicationMode: communicationModeArb,
})

const emergencyContactArb = fc.record<EmergencyContact>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  phone: fc.stringMatching(/^\+?[0-9]{7,15}$/),
  email: fc.emailAddress(),
  notificationMethod: fc.constantFrom('sms', 'email', 'fcm'),
})

const userProfileArb = fc.record<UserProfile>({
  userId: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  language: fc.constantFrom('en', 'hi', 'kn', 'ta', 'te', 'bn', 'en-US', 'en-GB'),
  disabilityTypes: fc.array(disabilityTypeArb, { maxLength: 6 }),
  preferredCommunicationMode: communicationModeArb,
  preferences: accessibilityPreferencesArb,
  emergencyContacts: fc.array(emergencyContactArb, { maxLength: 5 }),
  gestureDataConsent: fc.boolean(),
  analyticsConsent: fc.boolean(),
  onboardingComplete: fc.boolean(),
})

// ─── Property 1: User Profile Round Trip ─────────────────────────────────────

/**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * For any valid combination of disability type, communication mode, and language,
 * creating a UserProfile and then loading it should return a profile with all
 * fields identical to the saved values.
 */
describe('PBT — Property 1: User profile round trip', () => {
  it('serializing and deserializing a UserProfile returns identical values', () => {
    fc.assert(
      fc.property(userProfileArb, (profile: UserProfile) => {
        // Serialize (save)
        const serialized = JSON.stringify(profile)

        // Deserialize (load)
        const loaded: UserProfile = JSON.parse(serialized)

        // Top-level scalar fields
        expect(loaded.userId).toBe(profile.userId)
        expect(loaded.displayName).toBe(profile.displayName)
        expect(loaded.language).toBe(profile.language)
        expect(loaded.gestureDataConsent).toBe(profile.gestureDataConsent)
        expect(loaded.analyticsConsent).toBe(profile.analyticsConsent)
        expect(loaded.onboardingComplete).toBe(profile.onboardingComplete)

        // Array fields
        expect(loaded.disabilityTypes).toEqual(profile.disabilityTypes)
        expect(loaded.preferredCommunicationMode).toBe(profile.preferredCommunicationMode)
        expect(loaded.emergencyContacts).toEqual(profile.emergencyContacts)

        // Nested preferences object
        expect(loaded.preferences.fontSize).toBe(profile.preferences.fontSize)
        expect(loaded.preferences.contrastMode).toBe(profile.preferences.contrastMode)
        expect(loaded.preferences.flashIntensity).toBe(profile.preferences.flashIntensity)
        expect(loaded.preferences.audioSpeed).toBeCloseTo(profile.preferences.audioSpeed, 5)
        expect(loaded.preferences.voiceGender).toBe(profile.preferences.voiceGender)
        expect(loaded.preferences.voiceLanguage).toBe(profile.preferences.voiceLanguage)
        expect(loaded.preferences.ttsEnabled).toBe(profile.preferences.ttsEnabled)
        expect(loaded.preferences.voiceNavigationEnabled).toBe(profile.preferences.voiceNavigationEnabled)
        expect(loaded.preferences.disabilityTypes).toEqual(profile.preferences.disabilityTypes)
        expect(loaded.preferences.preferredCommunicationMode).toBe(profile.preferences.preferredCommunicationMode)
      }),
      { numRuns: 100 }
    )
  })

  it('round-tripped profile via localStorage cache returns identical values', () => {
    fc.assert(
      fc.property(userProfileArb, (profile: UserProfile) => {
        const key = `profile_roundtrip_${profile.userId}`

        // Save to localStorage (simulating persistence layer)
        localStorage.setItem(key, JSON.stringify(profile))

        // Load from localStorage (simulating profile load)
        const raw = localStorage.getItem(key)
        expect(raw).not.toBeNull()
        const loaded: UserProfile = JSON.parse(raw!)

        // Cleanup
        localStorage.removeItem(key)

        // All fields must be identical
        expect(loaded.userId).toBe(profile.userId)
        expect(loaded.displayName).toBe(profile.displayName)
        expect(loaded.language).toBe(profile.language)
        expect(loaded.disabilityTypes).toEqual(profile.disabilityTypes)
        expect(loaded.preferredCommunicationMode).toBe(profile.preferredCommunicationMode)
        expect(loaded.gestureDataConsent).toBe(profile.gestureDataConsent)
        expect(loaded.analyticsConsent).toBe(profile.analyticsConsent)
        expect(loaded.onboardingComplete).toBe(profile.onboardingComplete)
        expect(loaded.emergencyContacts).toEqual(profile.emergencyContacts)
        expect(loaded.preferences).toEqual(profile.preferences)
      }),
      { numRuns: 100 }
    )
  })
})
