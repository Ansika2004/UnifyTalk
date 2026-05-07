/**
 * AdminDashboard Page
 * Requirement 23.3: Aggregated session feedback ratings available in admin dashboard.
 * Requirement 22.1: Feature usage frequency, peak communication times, session durations.
 */

import { useEffect, useState } from 'react'
import { getAggregatedStats, type AggregatedStats } from '@/services/analyticsService'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAggregatedStats()
      .then(setStats)
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false))
  }, [])

  const ratingStars = (rating: number) => '⭐'.repeat(Math.round(rating))

  return (
    <main id="main-content" className="p-4 max-w-2xl mx-auto pb-20">
      <h1
        className="font-bold mb-6"
        style={{ fontSize: 'calc(var(--font-size-base) * 1.3)', color: 'var(--color-text)' }}
      >
        Admin Dashboard
      </h1>

      {loading && (
        <p role="status" aria-live="polite" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          Loading analytics…
        </p>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-lg mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Overview cards */}
          <section aria-labelledby="overview-heading" className="mb-8">
            <h2
              id="overview-heading"
              className="font-semibold mb-4"
              style={{ color: 'var(--color-text)' }}
            >
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Events" value={stats.totalEvents.toString()} />
              <StatCard
                label="Avg Session Duration"
                value={
                  stats.averageSessionDuration > 0
                    ? `${Math.round(stats.averageSessionDuration)}s`
                    : '—'
                }
              />
              <StatCard label="Feedback Responses" value={stats.feedbackCount.toString()} />
              <StatCard
                label="Average Rating"
                value={
                  stats.feedbackCount > 0
                    ? `${stats.averageRating.toFixed(2)} ${ratingStars(stats.averageRating)}`
                    : '—'
                }
              />
            </div>
          </section>

          {/* Rating distribution */}
          {stats.feedbackCount > 0 && (
            <section aria-labelledby="ratings-heading" className="mb-8">
              <h2
                id="ratings-heading"
                className="font-semibold mb-4"
                style={{ color: 'var(--color-text)' }}
              >
                Rating Distribution
              </h2>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star] ?? 0
                  const pct = stats.feedbackCount > 0 ? (count / stats.feedbackCount) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span
                        className="text-sm font-medium w-8 text-right"
                        style={{ color: 'var(--color-text)' }}
                        aria-label={`${star} star`}
                      >
                        {star}⭐
                      </span>
                      <div
                        className="flex-1 rounded-full h-4 overflow-hidden"
                        style={{ background: 'var(--color-border, #e5e7eb)' }}
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${star} star: ${count} responses (${Math.round(pct)}%)`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: 'var(--color-primary, #6366f1)',
                          }}
                        />
                      </div>
                      <span
                        className="text-sm w-10"
                        style={{ color: 'var(--color-text-muted, #6b7280)' }}
                      >
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Feature usage */}
          {Object.keys(stats.eventsByFeature).length > 0 && (
            <section aria-labelledby="features-heading" className="mb-8">
              <h2
                id="features-heading"
                className="font-semibold mb-4"
                style={{ color: 'var(--color-text)' }}
              >
                Feature Usage
              </h2>
              <table className="w-full text-sm" aria-label="Feature usage counts">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border, #e5e7eb)' }}>
                    <th className="text-left py-2 pr-4" style={{ color: 'var(--color-text)' }}>
                      Feature
                    </th>
                    <th className="text-right py-2" style={{ color: 'var(--color-text)' }}>
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.eventsByFeature)
                    .sort(([, a], [, b]) => b - a)
                    .map(([feature, count]) => (
                      <tr
                        key={feature}
                        style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}
                      >
                        <td className="py-2 pr-4 capitalize" style={{ color: 'var(--color-text)' }}>
                          {feature.replace(/-/g, ' ')}
                        </td>
                        <td
                          className="py-2 text-right font-mono"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {count}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

          {stats.totalEvents === 0 && stats.feedbackCount === 0 && (
            <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              No analytics data collected yet.
            </p>
          )}
        </>
      )}
    </main>
  )
}

// ─── Helper component ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--color-bg, #fff)',
        border: '2px solid var(--color-border, #e5e7eb)',
      }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text, #111)' }}>
        {value}
      </p>
    </div>
  )
}
