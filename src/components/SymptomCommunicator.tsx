import { useState } from 'react'
import type { BodyRegion, PainType, SymptomReport } from '../types/index'
import { summarizeSymptoms } from '../services/aiSummarizer'
import { submitSymptomReport } from '../services/symptomService'
import BodyDiagram from './BodyDiagram'
import PainSelector from './PainSelector'

export interface SymptomCommunicatorProps {
  patientId: string
  onReportSubmitted?: (report: SymptomReport) => void
}

export default function SymptomCommunicator({ patientId, onReportSubmitted }: SymptomCommunicatorProps) {
  const [selectedRegions, setSelectedRegions] = useState<BodyRegion[]>([])
  const [painType, setPainType] = useState<PainType | null>(null)
  const [intensity, setIntensity] = useState<number>(5)
  const [freeTextNote, setFreeTextNote] = useState<string>('')
  const [step, setStep] = useState<'input' | 'confirming' | 'submitting' | 'submitted'>('input')
  const [aiSummary, setAiSummary] = useState<string>('')
  const [fallbackUsed, setFallbackUsed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const canGenerate = selectedRegions.length > 0 && painType !== null

  function handleToggleRegion(region: BodyRegion) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    )
  }

  async function handleGenerateSummary() {
    if (!painType) return
    setLoading(true)
    try {
      const partialReport = {
        patientId,
        timestamp: null as unknown as import('firebase/firestore').Timestamp,
        bodyRegions: selectedRegions,
        painType,
        intensity,
        freeTextNote: freeTextNote || undefined,
      }
      const { summary, fallbackUsed: fb } = await summarizeSymptoms(partialReport)
      setAiSummary(summary)
      setFallbackUsed(fb)
      setStep('confirming')
    } catch {
      // Always show something — build a plain summary from inputs
      const regions = selectedRegions.join(', ') || 'unspecified area'
      const fallback = `Patient reports ${painType} pain in ${regions}, rated ${intensity}/10.${freeTextNote ? ' Note: ' + freeTextNote : ''}`
      setAiSummary(fallback)
      setFallbackUsed(true)
      setStep('confirming')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit() {
    setStep('input')
  }

  async function handleConfirmAndSend() {
    if (!painType) return
    setStep('submitting')
    setSubmitError(null)
    const report: Omit<SymptomReport, 'timestamp'> = {
      patientId,
      bodyRegions: selectedRegions,
      painType,
      intensity,
      freeTextNote: freeTextNote || undefined,
      aiSummary,
      fallbackUsed,
    }
    try {
      const reportId = await submitSymptomReport(report)
      const fullReport: SymptomReport = {
        ...report,
        timestamp: null as unknown as import('firebase/firestore').Timestamp,
      }
      onReportSubmitted?.(fullReport)
      console.debug('Symptom report submitted:', reportId)
      setStep('submitted')
    } catch (err) {
      console.error('Failed to submit symptom report:', err)
      setSubmitError('Failed to send your report. Please try again.')
      setStep('confirming')
    }
  }

  if (step === 'submitted') {
    return (
      <div className="symptom-communicator" aria-live="polite">
        <p
          role="status"
          style={{
            fontSize: '1.1rem',
            color: '#0ecfb0',
            fontWeight: 'bold',
            padding: '1.5rem',
            border: '1px solid rgba(14,207,176,0.4)',
            borderRadius: '8px',
            background: 'rgba(14,207,176,0.08)',
          }}
        >
          ✓ Report sent to your care team.
        </p>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="symptom-communicator" aria-live="polite">
        <h2 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>AI Symptom Report</h2>
        {fallbackUsed && (
          <div role="alert" style={{ padding: '0.5rem 0.875rem', marginBottom: '1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', color: '#fbbf24', fontSize: '0.82rem' }}>
            ⚠️ AI summary unavailable — showing structured report instead.
          </div>
        )}
        <div
          aria-label="Generated symptom summary"
          style={{
            padding: '1.25rem',
            border: '1px solid rgba(14,207,176,0.4)',
            borderRadius: '0.75rem',
            fontSize: '1rem',
            lineHeight: 1.7,
            marginBottom: '1.5rem',
            background: 'rgba(14,207,176,0.06)',
            color: '#f1f5f9',
            whiteSpace: 'pre-wrap',
          }}
        >
          {aiSummary || 'No summary generated.'}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {submitError && (
            <p role="alert" style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '0.75rem', width: '100%' }}>
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={handleEdit}
            style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}
          >
            ← Edit
          </button>
          <button
            type="button"
            onClick={handleConfirmAndSend}
            style={{ padding: '0.625rem 1.5rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #0ecfb0, #0a9e88)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✓ Confirm &amp; Send to Care Team
          </button>
        </div>
      </div>
    )
  }

  if (step === 'submitting') {
    return (
      <div className="symptom-communicator" aria-live="polite">
        <p style={{ color: '#94a3b8' }}>Sending your report to the care team…</p>
      </div>
    )
  }

  // step === 'input'
  return (
    <div className="symptom-communicator">
      <h2>Describe Your Symptoms</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <BodyDiagram selectedRegions={selectedRegions} onToggleRegion={handleToggleRegion} />
        </div>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <PainSelector
            painType={painType}
            intensity={intensity}
            freeTextNote={freeTextNote}
            onPainTypeChange={setPainType}
            onIntensityChange={setIntensity}
            onNoteChange={setFreeTextNote}
          />
        </div>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          disabled={!canGenerate || loading}
          onClick={handleGenerateSummary}
          aria-busy={loading}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            background: canGenerate && !loading ? '#27ae60' : '#aaa',
            color: '#fff',
            border: 'none',
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating…' : 'Generate Summary'}
        </button>
        {!canGenerate && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Select at least one body region and a pain type to continue.
          </p>
        )}
      </div>
    </div>
  )
}
