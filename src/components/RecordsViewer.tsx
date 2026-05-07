/**
 * Records_Viewer — displays medical records with AI plain-language summaries,
 * accessibility controls, filtering, and offline cache fallback.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import React, { useEffect, useState } from 'react'
import type { MedicalRecord } from '../types'
import { fetchRecords, filterRecords, type RecordFilters } from '../services/recordsService'
import { summarizeRecord } from '../services/aiSummarizer'
import { ttsEngine } from '../services/ttsEngine'
import { useGlobalStore } from '../store/globalStore'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecordsViewerProps {
  patientId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordsViewer({ patientId }: RecordsViewerProps) {
  const [allRecords, setAllRecords] = useState<MedicalRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({})

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [testTypeFilter, setTestTypeFilter] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('')

  // Accessibility
  const highContrast = useGlobalStore((s) => s.highContrast)
  const largeFontEnabled = useGlobalStore((s) => s.largeFontEnabled)
  const toggleHighContrast = useGlobalStore((s) => s.toggleHighContrast)
  const toggleLargeFontEnabled = useGlobalStore((s) => s.toggleLargeFontEnabled)

  // ── Load records ──────────────────────────────────────────────────────────
  useEffect(() => {
    let stale = false

    async function load() {
      setLoading(true)
      try {
        const apiUrl = import.meta.env.VITE_HOSPITAL_API_URL as string | undefined
        if (!apiUrl) {
          stale = true
        }
        const records = await fetchRecords(patientId)
        if (!stale) {
          setLastUpdated(new Date())
          setIsStale(false)
        } else {
          setIsStale(true)
          // Use cachedAt from first record if available
          if (records.length > 0) {
            setLastUpdated(records[0].cachedAt.toDate())
          }
        }
        setAllRecords(records)
        setFilteredRecords(records)
      } catch {
        setIsStale(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [patientId])

  // ── Apply filters ─────────────────────────────────────────────────────────
  useEffect(() => {
    const filters: RecordFilters = {}
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (testTypeFilter) filters.testType = testTypeFilter
    if (doctorFilter) filters.orderingDoctor = doctorFilter

    setFilteredRecords(filterRecords(allRecords, filters))
  }, [allRecords, startDate, endDate, testTypeFilter, doctorFilter])

  // ── Summarize a record ────────────────────────────────────────────────────
  async function handleSelectRecord(record: MedicalRecord) {
    setSelectedRecord(record)
    setShowOriginal(false)

    if (!summaryCache[record.recordId] && !record.plainLanguageSummary) {
      setSummarizing(true)
      try {
        const summary = await summarizeRecord(record.originalUrl ?? record.testType)
        setSummaryCache((prev) => ({ ...prev, [record.recordId]: summary }))
      } catch {
        setSummaryCache((prev) => ({ ...prev, [record.recordId]: record.testType }))
      } finally {
        setSummarizing(false)
      }
    }
  }

  function getDisplaySummary(record: MedicalRecord): string {
    return (
      record.plainLanguageSummary ||
      summaryCache[record.recordId] ||
      'Summary not available.'
    )
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  function handleTTS() {
    if (!selectedRecord) return
    ttsEngine.speak(getDisplaySummary(selectedRecord))
  }

  // ── PDF upload ────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { uploadRecord } = await import('../services/recordsService')
      await uploadRecord(patientId, file, {
        orderingDoctor: 'Unknown',
        testType: file.name,
      })
      // Reload records
      const records = await fetchRecords(patientId)
      setAllRecords(records)
    } catch (err) {
      console.error('[RecordsViewer] Upload failed:', err)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`records-viewer ${highContrast ? 'high-contrast' : ''} ${largeFontEnabled ? 'large-font' : ''}`}
    >
      {/* Accessibility controls */}
      <div className="accessibility-controls">
        <button
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          aria-label="Toggle high contrast"
        >
          {highContrast ? '🌑 High Contrast ON' : '🌕 High Contrast OFF'}
        </button>
        <button
          onClick={toggleLargeFontEnabled}
          aria-pressed={largeFontEnabled}
          aria-label="Toggle large font"
        >
          {largeFontEnabled ? 'A Large Font ON' : 'A Large Font OFF'}
        </button>
      </div>

      {/* Stale data indicator */}
      {isStale && lastUpdated && (
        <div className="stale-indicator" role="alert">
          ⚠️ Showing cached data. Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
      {!isStale && lastUpdated && (
        <div className="freshness-indicator">
          ✅ Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* PDF upload */}
      <div className="upload-section">
        <label htmlFor="pdf-upload">Upload medical record (PDF):</label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
        />
      </div>

      {/* Filters */}
      <div className="filters" role="search" aria-label="Filter records">
        <label>
          From:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
          />
        </label>
        <label>
          To:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
          />
        </label>
        <label>
          Test type:
          <input
            type="text"
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            placeholder="e.g. Blood test"
            aria-label="Filter by test type"
          />
        </label>
        <label>
          Ordering doctor:
          <input
            type="text"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            placeholder="Doctor name"
            aria-label="Filter by ordering doctor"
          />
        </label>
      </div>

      {/* Records list */}
      {loading ? (
        <p>Loading records…</p>
      ) : filteredRecords.length === 0 ? (
        <p>No records found.</p>
      ) : (
        <ul className="records-list" aria-label="Medical records">
          {filteredRecords.map((record) => (
            <li key={record.recordId}>
              <button
                className={`record-item ${selectedRecord?.recordId === record.recordId ? 'selected' : ''}`}
                onClick={() => handleSelectRecord(record)}
              >
                <strong>{record.testType}</strong> — {record.date.toDate().toLocaleDateString()}
                <br />
                Dr. {record.orderingDoctor}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Record detail */}
      {selectedRecord && (
        <div className="record-detail" aria-live="polite">
          {/* Prominent header */}
          <header className="record-header">
            <h2>{selectedRecord.testType}</h2>
            <p>
              <strong>Date:</strong> {selectedRecord.date.toDate().toLocaleDateString()}
            </p>
            <p>
              <strong>Ordering Doctor:</strong> {selectedRecord.orderingDoctor}
            </p>
          </header>

          {/* TTS button */}
          <button onClick={handleTTS} aria-label="Read summary aloud">
            🔊 Read aloud
          </button>

          {/* Toggle original */}
          <button
            onClick={() => setShowOriginal((v) => !v)}
            aria-pressed={showOriginal}
          >
            {showOriginal ? 'Show Plain Language' : 'View Original'}
          </button>

          {/* Summary or original */}
          {summarizing ? (
            <p>Generating plain-language summary…</p>
          ) : showOriginal ? (
            <div className="record-original">
              <h3>Original Document</h3>
              {selectedRecord.originalUrl ? (
                <a href={selectedRecord.originalUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF
                </a>
              ) : (
                <p>No original document available.</p>
              )}
            </div>
          ) : (
            <div className="record-summary">
              <h3>Plain Language Summary</h3>
              <p>{getDisplaySummary(selectedRecord)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RecordsViewer
