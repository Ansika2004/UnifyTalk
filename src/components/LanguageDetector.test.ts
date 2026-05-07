import { describe, it, expect } from 'vitest'
import { mapLocale } from './LanguageDetector'

/**
 * Unit tests for mapLocale — Validates: Requirements 7.1, 7.2
 */
describe('mapLocale', () => {
  // Supported locales — exact match
  it('maps "kn" to "kn"', () => expect(mapLocale('kn')).toBe('kn'))
  it('maps "kn-IN" to "kn"', () => expect(mapLocale('kn-IN')).toBe('kn'))
  it('maps "hi" to "hi"', () => expect(mapLocale('hi')).toBe('hi'))
  it('maps "hi-IN" to "hi"', () => expect(mapLocale('hi-IN')).toBe('hi'))
  it('maps "ta" to "ta"', () => expect(mapLocale('ta')).toBe('ta'))
  it('maps "ta-IN" to "ta"', () => expect(mapLocale('ta-IN')).toBe('ta'))
  it('maps "te" to "te"', () => expect(mapLocale('te')).toBe('te'))
  it('maps "te-IN" to "te"', () => expect(mapLocale('te-IN')).toBe('te'))
  it('maps "bn" to "bn"', () => expect(mapLocale('bn')).toBe('bn'))
  it('maps "bn-BD" to "bn"', () => expect(mapLocale('bn-BD')).toBe('bn'))
  it('maps "en" to "en"', () => expect(mapLocale('en')).toBe('en'))
  it('maps "en-US" to "en"', () => expect(mapLocale('en-US')).toBe('en'))

  // Unsupported locales — fallback to "en"
  it('falls back to "en" for unsupported locale "fr"', () => expect(mapLocale('fr')).toBe('en'))
  it('falls back to "en" for unsupported locale "zh-CN"', () => expect(mapLocale('zh-CN')).toBe('en'))
  it('falls back to "en" for empty string', () => expect(mapLocale('')).toBe('en'))
})
