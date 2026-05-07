import { describe, it, expect, beforeEach } from 'vitest'
import { useGlobalStore } from './globalStore'
import type { SupportedLocale } from './globalStore'

// Reset store state before each test to ensure isolation
beforeEach(() => {
  useGlobalStore.setState({
    activeInputMode: 'touch',
    language: 'en',
    audioMuted: false,
    eyeGazeEnabled: false,
    highContrast: false,
    largeFontEnabled: false,
  })
})

describe('globalStore — initial state', () => {
  it('has correct defaults', () => {
    const s = useGlobalStore.getState()
    expect(s.activeInputMode).toBe('touch')
    expect(s.language).toBe('en')
    expect(s.audioMuted).toBe(false)
    expect(s.eyeGazeEnabled).toBe(false)
    expect(s.highContrast).toBe(false)
    expect(s.largeFontEnabled).toBe(false)
  })
})

describe('globalStore — activeInputMode', () => {
  it('sets mode to voice', () => {
    useGlobalStore.getState().setActiveInputMode('voice')
    expect(useGlobalStore.getState().activeInputMode).toBe('voice')
  })

  it('sets mode to touch', () => {
    useGlobalStore.getState().setActiveInputMode('voice')
    useGlobalStore.getState().setActiveInputMode('touch')
    expect(useGlobalStore.getState().activeInputMode).toBe('touch')
  })
})

describe('globalStore — language', () => {
  const locales: SupportedLocale[] = ['en', 'kn', 'hi', 'ta', 'te', 'bn']

  it.each(locales)('accepts locale "%s"', (locale) => {
    useGlobalStore.getState().setLanguage(locale)
    expect(useGlobalStore.getState().language).toBe(locale)
  })
})

describe('globalStore — audioMuted', () => {
  it('sets muted to true', () => {
    useGlobalStore.getState().setAudioMuted(true)
    expect(useGlobalStore.getState().audioMuted).toBe(true)
  })

  it('toggles muted state', () => {
    useGlobalStore.getState().toggleAudioMuted()
    expect(useGlobalStore.getState().audioMuted).toBe(true)
    useGlobalStore.getState().toggleAudioMuted()
    expect(useGlobalStore.getState().audioMuted).toBe(false)
  })
})

describe('globalStore — eyeGazeEnabled', () => {
  it('sets eyeGazeEnabled to true', () => {
    useGlobalStore.getState().setEyeGazeEnabled(true)
    expect(useGlobalStore.getState().eyeGazeEnabled).toBe(true)
  })

  it('toggles eyeGazeEnabled', () => {
    useGlobalStore.getState().toggleEyeGazeEnabled()
    expect(useGlobalStore.getState().eyeGazeEnabled).toBe(true)
    useGlobalStore.getState().toggleEyeGazeEnabled()
    expect(useGlobalStore.getState().eyeGazeEnabled).toBe(false)
  })
})

describe('globalStore — highContrast', () => {
  it('sets highContrast to true', () => {
    useGlobalStore.getState().setHighContrast(true)
    expect(useGlobalStore.getState().highContrast).toBe(true)
  })

  it('toggles highContrast', () => {
    useGlobalStore.getState().toggleHighContrast()
    expect(useGlobalStore.getState().highContrast).toBe(true)
    useGlobalStore.getState().toggleHighContrast()
    expect(useGlobalStore.getState().highContrast).toBe(false)
  })
})

describe('globalStore — largeFontEnabled', () => {
  it('sets largeFontEnabled to true', () => {
    useGlobalStore.getState().setLargeFontEnabled(true)
    expect(useGlobalStore.getState().largeFontEnabled).toBe(true)
  })

  it('toggles largeFontEnabled', () => {
    useGlobalStore.getState().toggleLargeFontEnabled()
    expect(useGlobalStore.getState().largeFontEnabled).toBe(true)
    useGlobalStore.getState().toggleLargeFontEnabled()
    expect(useGlobalStore.getState().largeFontEnabled).toBe(false)
  })
})

describe('globalStore — state slices are independent', () => {
  it('toggling highContrast does not affect other flags', () => {
    useGlobalStore.getState().toggleHighContrast()
    const s = useGlobalStore.getState()
    expect(s.highContrast).toBe(true)
    expect(s.largeFontEnabled).toBe(false)
    expect(s.audioMuted).toBe(false)
    expect(s.eyeGazeEnabled).toBe(false)
  })

  it('changing language does not affect input mode', () => {
    useGlobalStore.getState().setLanguage('hi')
    expect(useGlobalStore.getState().activeInputMode).toBe('touch')
  })
})
