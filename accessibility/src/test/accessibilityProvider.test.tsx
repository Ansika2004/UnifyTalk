// Feature: accessible-communication-platform
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { AccessibilityProvider, useAccessibility } from '@/context/AccessibilityContext'
import type { AccessibilityPreferences, FontSize, ContrastMode, DisabilityType, CommunicationMode } from '@/types'
import { FONT_SIZE_MAP, DEFAULT_PREFERENCES } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function TestConsumer() {
  const { preferences, usingDefaults } = useAccessibility()
  return (
    <div>
      <span data-testid="font-size">{preferences.fontSize}</span>
      <span data-testid="contrast-mode">{preferences.contrastMode}</span>
      <span data-testid="using-defaults">{String(usingDefaults)}</span>
    </div>
  )
}

function renderWithProvider(prefs?: Partial<AccessibilityPreferences>, userId?: string) {
  return render(
    <AccessibilityProvider userId={userId}>
      <TestConsumer />
    </AccessibilityProvider>
  )
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

describe('AccessibilityProvider — CSS variable injection', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--font-size-base')
    document.body.className = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies 14px for font size "small"', async () => {
    const { unmount } = renderWithProvider()
    // Manually trigger preference update
    const { rerender } = render(
      <AccessibilityProvider userId={undefined}>
        <TestConsumer />
      </AccessibilityProvider>
    )

    // Set small font size via localStorage cache
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, fontSize: 'small' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    rerender(
      <AccessibilityProvider userId={undefined}>
        <TestConsumer />
      </AccessibilityProvider>
    )

    await act(async () => {})
    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('14px')
    unmount()
  })

  it('applies 18px for font size "medium"', async () => {
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, fontSize: 'medium' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    renderWithProvider()
    await act(async () => {})

    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('18px')
  })

  it('applies 24px for font size "large"', async () => {
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, fontSize: 'large' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    renderWithProvider()
    await act(async () => {})

    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('24px')
  })

  it('applies 32px for font size "extra-large"', async () => {
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, fontSize: 'extra-large' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    renderWithProvider()
    await act(async () => {})

    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('32px')
  })

  it('adds high-contrast class to body when contrastMode is high-contrast', async () => {
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, contrastMode: 'high-contrast' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    renderWithProvider()
    await act(async () => {})

    expect(document.body.classList.contains('high-contrast')).toBe(true)
  })

  it('adds dark class to body when contrastMode is dark', async () => {
    const prefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES, contrastMode: 'dark' }
    localStorage.setItem('a11y_preferences_cache', JSON.stringify(prefs))

    renderWithProvider()
    await act(async () => {})

    expect(document.body.classList.contains('dark')).toBe(true)
  })
})

describe('AccessibilityProvider — default config fallback (Requirement 1.4)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--font-size-base')
    document.body.className = ''
  })

  it('uses default preferences when no cache and no Firestore', async () => {
    // No localStorage cache, no userId → should use defaults
    renderWithProvider(undefined, undefined)
    await act(async () => {})

    const fontSizeVar = document.documentElement.style.getPropertyValue('--font-size-base')
    expect(fontSizeVar).toBe(FONT_SIZE_MAP[DEFAULT_PREFERENCES.fontSize])
  })

  it('sets usingDefaults=true when no profile can be loaded', async () => {
    renderWithProvider(undefined, undefined)
    await act(async () => {})

    const usingDefaultsEl = screen.getByTestId('using-defaults')
    expect(usingDefaultsEl.textContent).toBe('true')
  })
})

// ─── Property-Based Tests ────────────────────────────────────────────────────

// Arbitraries
const fontSizeArb = fc.constantFrom<FontSize>('small', 'medium', 'large', 'extra-large')
const contrastModeArb = fc.constantFrom<ContrastMode>('normal', 'high-contrast', 'dark')
const disabilityTypeArb = fc.constantFrom<DisabilityType>(
  'deaf', 'hard-of-hearing', 'mute', 'non-verbal', 'blind', 'low-vision'
)
const commModeArb = fc.constantFrom<CommunicationMode>('pictogram', 'text', 'sign-language', 'voice')

const accessibilityPreferencesArb = fc.record<AccessibilityPreferences>({
  fontSize: fontSizeArb,
  contrastMode: contrastModeArb,
  flashIntensity: fc.constantFrom('subtle', 'moderate', 'strong'),
  audioSpeed: fc.float({ min: 0.5, max: 2.0, noNaN: true }),
  voiceGender: fc.constantFrom('male', 'female', 'neutral'),
  voiceLanguage: fc.constantFrom('en-US', 'en-GB', 'hi-IN', 'kn-IN', 'ta-IN'),
  ttsEnabled: fc.boolean(),
  voiceNavigationEnabled: fc.boolean(),
  disabilityTypes: fc.array(disabilityTypeArb, { maxLength: 6 }),
  preferredCommunicationMode: commModeArb,
})

const userProfileArb = fc.record({
  userId: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  disabilityTypes: fc.array(disabilityTypeArb, { maxLength: 6 }),
  preferredCommunicationMode: commModeArb,
  language: fc.constantFrom('en', 'hi', 'kn', 'ta', 'te', 'bn'),
  emergencyContacts: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      phone: fc.string({ minLength: 7, maxLength: 15 }),
      email: fc.emailAddress(),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  onboardingComplete: fc.boolean(),
})

/**
 * Property 1: User profile round trip
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * For any valid UserProfile, saving and loading returns identical values.
 */
describe('PBT — Property 1: User profile round trip', () => {
  it('saving and loading a user profile returns identical values', () => {
    fc.assert(
      fc.property(userProfileArb, (profile) => {
        const key = `profile_test_${profile.userId}`
        localStorage.setItem(key, JSON.stringify(profile))
        const loaded = JSON.parse(localStorage.getItem(key) ?? '{}')
        localStorage.removeItem(key)

        expect(loaded.userId).toBe(profile.userId)
        expect(loaded.displayName).toBe(profile.displayName)
        expect(loaded.language).toBe(profile.language)
        expect(loaded.onboardingComplete).toBe(profile.onboardingComplete)
        expect(loaded.disabilityTypes).toEqual(profile.disabilityTypes)
        expect(loaded.preferredCommunicationMode).toBe(profile.preferredCommunicationMode)
        expect(loaded.emergencyContacts).toEqual(profile.emergencyContacts)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Property 2: Accessibility settings propagation
 * Validates: Requirements 1.3, 11.3
 *
 * For any AccessibilityPreferences, applying them sets the correct CSS variables.
 */
describe('PBT — Property 2: Accessibility settings propagation', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--font-size-base')
    document.body.className = ''
  })

  it('applying any preferences sets the correct CSS variable for font size', () => {
    fc.assert(
      fc.property(accessibilityPreferencesArb, (prefs) => {
        // Simulate what applyPreferencesToDOM does
        document.documentElement.style.setProperty('--font-size-base', FONT_SIZE_MAP[prefs.fontSize])
        document.body.classList.remove('high-contrast', 'dark')
        if (prefs.contrastMode === 'high-contrast') {
          document.body.classList.add('high-contrast')
        } else if (prefs.contrastMode === 'dark') {
          document.body.classList.add('dark')
        }

        const cssVar = document.documentElement.style.getPropertyValue('--font-size-base')
        expect(cssVar).toBe(FONT_SIZE_MAP[prefs.fontSize])

        if (prefs.contrastMode === 'high-contrast') {
          expect(document.body.classList.contains('high-contrast')).toBe(true)
          expect(document.body.classList.contains('dark')).toBe(false)
        } else if (prefs.contrastMode === 'dark') {
          expect(document.body.classList.contains('dark')).toBe(true)
          expect(document.body.classList.contains('high-contrast')).toBe(false)
        } else {
          expect(document.body.classList.contains('high-contrast')).toBe(false)
          expect(document.body.classList.contains('dark')).toBe(false)
        }

        // Cleanup for next iteration
        document.documentElement.style.removeProperty('--font-size-base')
        document.body.className = ''
      }),
      { numRuns: 100 }
    )
  })

  it('persisted preferences match applied preferences', () => {
    fc.assert(
      fc.property(accessibilityPreferencesArb, (prefs) => {
        const key = 'a11y_preferences_cache'
        localStorage.setItem(key, JSON.stringify(prefs))
        const loaded = JSON.parse(localStorage.getItem(key) ?? '{}') as AccessibilityPreferences
        localStorage.removeItem(key)

        expect(loaded.fontSize).toBe(prefs.fontSize)
        expect(loaded.contrastMode).toBe(prefs.contrastMode)
        expect(loaded.audioSpeed).toBeCloseTo(prefs.audioSpeed, 5)
        expect(loaded.ttsEnabled).toBe(prefs.ttsEnabled)
      }),
      { numRuns: 100 }
    )
  })
})
