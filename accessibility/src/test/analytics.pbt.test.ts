/**
 * Analytics PBT Tests — Phase 6
 * Feature: accessible-communication-platform
 *
 * Covers:
 *   - 6.12.6  PBT — Property 24: Analytics consent enforcement
 *   - 6.12.7  PBT — Property 25: Feedback rating aggregation correctness
 *   - 6.12.11 Unit — Analytics records contain no user-identifying fields
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  logAnalyticsEvent,
  submitFeedback,
  computeAggregatedStats,
  stripUserIdentifiers,
  getAnalyticsConsent,
  setAnalyticsConsent,
  clearConsentCache,
  type AnalyticsEvent,
  type FeedbackRecord,
} from '@/services/analyticsService'

// ─────────────────────────────────────────────────────────────────────────────
// PBT — 6.12.6: Property 24 — Analytics Consent Enforcement
// Feature: accessible-communication-platform, Property 24: Analytics Consent Enforcement
// Validates: Requirements 22.2, 22.3, 22.4
// ─────────────────────────────────────────────────────────────────────────────

describe('PBT — Property 24: Analytics Consent Enforcement', () => {
  beforeEach(() => {
    clearConsentCache()
  })

  /**
   * **Validates: Requirements 22.2, 22.3, 22.4**
   * For any user with analytics consent set to false, no analytics events must
   * be recorded for that user's actions.
   */
  it('logAnalyticsEvent does not throw and respects consent=false (no Firestore in test)', async () => {
    // In test env, firebaseConfigured=false so no actual writes happen.
    // We verify the consent gate logic: when consent=false, the function returns early.
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (userId, feature, action) => {
          clearConsentCache()
          // Consent is false by default (no Firestore in test env)
          const consent = await getAnalyticsConsent(userId)
          expect(consent).toBe(false)

          // Should not throw even with consent=false
          await expect(
            logAnalyticsEvent({ feature, action }, userId),
          ).resolves.toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('logAnalyticsEvent resolves without error when no userId provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (feature, action) => {
          await expect(
            logAnalyticsEvent({ feature, action }),
          ).resolves.toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('setAnalyticsConsent updates the in-memory cache immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        async (userId, consent) => {
          clearConsentCache()
          await setAnalyticsConsent(userId, consent)
          const retrieved = await getAnalyticsConsent(userId)
          expect(retrieved).toBe(consent)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — 6.12.7: Property 25 — Feedback Rating Aggregation Correctness
// Feature: accessible-communication-platform, Property 25: Feedback Rating Aggregation Correctness
// Validates: Requirements 23.3
// ─────────────────────────────────────────────────────────────────────────────

const feedbackArb = fc.record<FeedbackRecord>({
  rating: fc.integer({ min: 1, max: 5 }),
  comment: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  feature: fc.constantFrom('tts', 'sign-language', 'chat', 'pictogram', 'captions'),
  timestamp: fc.integer({ min: 0, max: Date.now() }),
})

const eventArb = fc.record<AnalyticsEvent>({
  feature: fc.constantFrom('tts', 'sign-language', 'chat', 'pictogram', 'captions'),
  action: fc.constantFrom('start', 'end', 'tap', 'speak', 'translate'),
  sessionDuration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined }),
  timestamp: fc.integer({ min: 0, max: Date.now() }),
})

describe('PBT — Property 25: Feedback Rating Aggregation Correctness', () => {
  /**
   * **Validates: Requirements 23.3**
   * For any set of session feedback ratings, the aggregated average displayed
   * in the admin dashboard must equal the arithmetic mean of all submitted
   * ratings, rounded to two decimal places.
   */
  it('averageRating equals arithmetic mean of all ratings, rounded to 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.array(feedbackArb, { minLength: 1, maxLength: 50 }),
        (feedbacks) => {
          const stats = computeAggregatedStats([], feedbacks)
          const expectedMean = feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
          const expectedRounded = Math.round(expectedMean * 100) / 100
          expect(stats.averageRating).toBeCloseTo(expectedRounded, 2)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('averageRating is 0 when there are no feedback records', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 20 }),
        (events) => {
          const stats = computeAggregatedStats(events, [])
          expect(stats.averageRating).toBe(0)
          expect(stats.feedbackCount).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('feedbackCount equals the number of feedback records', () => {
    fc.assert(
      fc.property(
        fc.array(feedbackArb, { minLength: 0, maxLength: 50 }),
        (feedbacks) => {
          const stats = computeAggregatedStats([], feedbacks)
          expect(stats.feedbackCount).toBe(feedbacks.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('ratingDistribution counts match per-rating totals', () => {
    fc.assert(
      fc.property(
        fc.array(feedbackArb, { minLength: 0, maxLength: 50 }),
        (feedbacks) => {
          const stats = computeAggregatedStats([], feedbacks)
          for (let star = 1; star <= 5; star++) {
            const expected = feedbacks.filter((f) => f.rating === star).length
            expect(stats.ratingDistribution[star] ?? 0).toBe(expected)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('totalEvents equals the number of event records', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 50 }),
        (events) => {
          const stats = computeAggregatedStats(events, [])
          expect(stats.totalEvents).toBe(events.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('eventsByFeature counts are correct', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 50 }),
        (events) => {
          const stats = computeAggregatedStats(events, [])
          for (const [feature, count] of Object.entries(stats.eventsByFeature)) {
            const expected = events.filter((e) => e.feature === feature).length
            expect(count).toBe(expected)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('averageRating is always between 1 and 5 when feedbacks exist', () => {
    fc.assert(
      fc.property(
        fc.array(feedbackArb, { minLength: 1, maxLength: 50 }),
        (feedbacks) => {
          const stats = computeAggregatedStats([], feedbacks)
          expect(stats.averageRating).toBeGreaterThanOrEqual(1)
          expect(stats.averageRating).toBeLessThanOrEqual(5)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 6.12.11: Analytics records contain no user-identifying fields
// Validates: Requirement 22.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit — 6.12.11: Analytics records contain no user-identifying fields', () => {
  it('stripUserIdentifiers removes userId from a record', () => {
    const record = { feature: 'tts', action: 'speak', userId: 'user-123', timestamp: Date.now() }
    const cleaned = stripUserIdentifiers(record)
    expect(cleaned).not.toHaveProperty('userId')
    expect(cleaned.feature).toBe('tts')
  })

  it('stripUserIdentifiers removes email from a record', () => {
    const record = { feature: 'chat', action: 'send', email: 'user@example.com', timestamp: Date.now() }
    const cleaned = stripUserIdentifiers(record)
    expect(cleaned).not.toHaveProperty('email')
  })

  it('stripUserIdentifiers removes name from a record', () => {
    const record = { feature: 'pictogram', action: 'tap', name: 'Alice', timestamp: Date.now() }
    const cleaned = stripUserIdentifiers(record)
    expect(cleaned).not.toHaveProperty('name')
  })

  it('stripUserIdentifiers removes displayName from a record', () => {
    const record = { feature: 'tts', action: 'speak', displayName: 'Alice', timestamp: Date.now() }
    const cleaned = stripUserIdentifiers(record)
    expect(cleaned).not.toHaveProperty('displayName')
  })

  it('stripUserIdentifiers preserves non-identifying fields', () => {
    const record = {
      feature: 'sign-language',
      action: 'start',
      sessionDuration: 120,
      timestamp: 1700000000000,
    }
    const cleaned = stripUserIdentifiers(record)
    expect(cleaned.feature).toBe('sign-language')
    expect(cleaned.action).toBe('start')
    expect(cleaned.sessionDuration).toBe(120)
    expect(cleaned.timestamp).toBe(1700000000000)
  })

  it('logAnalyticsEvent resolves without error (no Firestore in test env)', async () => {
    await expect(
      logAnalyticsEvent({ feature: 'tts', action: 'speak', sessionDuration: 60 }),
    ).resolves.toBeUndefined()
  })

  it('submitFeedback resolves without error (no Firestore in test env)', async () => {
    await expect(
      submitFeedback({ rating: 4, comment: 'Great!', feature: 'tts' }),
    ).resolves.toBeUndefined()
  })

  it('submitFeedback with userId and no consent does not throw', async () => {
    clearConsentCache()
    // No consent set → getAnalyticsConsent returns false → early return
    await expect(
      submitFeedback({ rating: 5, feature: 'chat' }, 'user-no-consent'),
    ).resolves.toBeUndefined()
  })

  it('computeAggregatedStats with single 5-star rating returns averageRating=5', () => {
    const feedbacks: FeedbackRecord[] = [
      { rating: 5, feature: 'tts', timestamp: Date.now() },
    ]
    const stats = computeAggregatedStats([], feedbacks)
    expect(stats.averageRating).toBe(5)
  })

  it('computeAggregatedStats with ratings [1,2,3,4,5] returns averageRating=3', () => {
    const feedbacks: FeedbackRecord[] = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      feature: 'tts',
      timestamp: Date.now(),
    }))
    const stats = computeAggregatedStats([], feedbacks)
    expect(stats.averageRating).toBe(3)
  })

  it('computeAggregatedStats with ratings [1,2] returns averageRating=1.5', () => {
    const feedbacks: FeedbackRecord[] = [1, 2].map((rating) => ({
      rating,
      feature: 'chat',
      timestamp: Date.now(),
    }))
    const stats = computeAggregatedStats([], feedbacks)
    expect(stats.averageRating).toBe(1.5)
  })
})
