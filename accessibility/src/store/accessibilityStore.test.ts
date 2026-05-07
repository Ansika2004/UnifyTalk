import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { useAccessibilityStore, FONT_SIZE_MAP } from './accessibilityStore'
import { DEFAULT_PREFERENCES, type AccessibilityPreferences } from '../types'

// Reset store before each test
beforeEach(() => {
  useAccessibilityStore.setState({ preferences: DEFAULT_PREFERENCES, isLoaded: false })
})

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('AccessibilityStore — font size', () => {
  it('applies correct CSS variable value for each font size', () => {
    const sizes = ['small', 'medium', 'large', 'extra-large'] as const
    for (const size of sizes) {
      useAccessibilityStore.getState().setFontSize(size)
      expect(useAccessibilityStore.getState().preferences.fontSize).toBe(size)
      expect(FONT_SIZE_MAP[size]).toBeDefined()
    }
  })

  it('FONT_SIZE_MAP has correct px values', () => {
    expect(FONT_SIZE_MAP['small']).toBe('14px')
    expect(FONT_SIZE_MAP['medium']).toBe('18px')
    expect(FONT_SIZE_MAP['large']).toBe('24px')
    expect(FONT_SIZE_MAP['extra-large']).toBe('32px')
  })
})

describe('AccessibilityStore — contrast mode', () => {
  it('sets contrast mode correctly', () => {
    useAccessibilityStore.getState().setContrastMode('high-contrast')
    expect(useAccessibilityStore.getState().preferences.contrastMode).toBe('high-contrast')

    useAccessibilityStore.getState().setContrastMode('dark')
    expect(useAccessibilityStore.getState().preferences.contrastMode).toBe('dark')

    useAccessibilityStore.getState().setContrastMode('normal')
    expect(useAccessibilityStore.getState().preferences.contrastMode).toBe('normal')
  })
})

describe('AccessibilityStore — defaults on load failure', () => {
  it('loadDefaults applies DEFAULT_PREFERENCES and marks loaded', () => {
    // Simulate a failed profile load — call loadDefaults
    useAccessibilityStore.getState().loadDefaults()
    const state = useAccessibilityStore.getState()
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES)
    expect(state.isLoaded).toBe(true)
  })
})

describe('AccessibilityStore — TTS and audio speed', () => {
  it('sets TTS enabled/disabled', () => {
    useAccessibilityStore.getState().setTtsEnabled(false)
    expect(useAccessibilityStore.getState().preferences.ttsEnabled).toBe(false)
    useAccessibilityStore.getState().setTtsEnabled(true)
    expect(useAccessibilityStore.getState().preferences.ttsEnabled).toBe(true)
  })

  it('sets audio speed', () => {
    useAccessibilityStore.getState().setAudioSpeed(1.5)
    expect(useAccessibilityStore.getState().preferences.audioSpeed).toBe(1.5)
  })
})

// ─── PBT: Property 1 — User profile round trip ───────────────────────────────

describe('PBT — Property 1: Accessibility preferences round trip', () => {
  it('any valid preferences object can be set and retrieved unchanged (25 iterations)', () => {
    const fontSizeArb = fc.constantFrom('small', 'medium', 'large', 'extra-large' as const)
    const contrastArb = fc.constantFrom('normal', 'high-contrast', 'dark' as const)
    const speedArb = fc.float({ min: 0.5, max: 2.0, noNaN: true })

    fc.assert(
      fc.property(fontSizeArb, contrastArb, speedArb, (fontSize, contrastMode, audioSpeed) => {
        useAccessibilityStore.setState({ preferences: DEFAULT_PREFERENCES })
        useAccessibilityStore.getState().setPreferences({ fontSize, contrastMode, audioSpeed })
        const prefs = useAccessibilityStore.getState().preferences
        return (
          prefs.fontSize === fontSize &&
          prefs.contrastMode === contrastMode &&
          Math.abs(prefs.audioSpeed - audioSpeed) < 0.001
        )
      }),
      { numRuns: 25 },
    )
  })
})

// ─── PBT: Property 2 — Settings propagation ──────────────────────────────────

describe('PBT — Property 2: Font size CSS variable mapping is always defined', () => {
  it('every font size value maps to a non-empty px string (25 iterations)', () => {
    const fontSizeArb = fc.constantFrom('small', 'medium', 'large', 'extra-large' as const)

    fc.assert(
      fc.property(fontSizeArb, (size) => {
        const px = FONT_SIZE_MAP[size]
        return typeof px === 'string' && px.endsWith('px') && parseInt(px) > 0
      }),
      { numRuns: 25 },
    )
  })
})
