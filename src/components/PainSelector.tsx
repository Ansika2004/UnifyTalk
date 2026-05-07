import type { PainType } from '../types/index'

interface PainSelectorProps {
  painType: PainType | null
  intensity: number // 1–10
  freeTextNote: string
  onPainTypeChange: (type: PainType) => void
  onIntensityChange: (value: number) => void
  onNoteChange: (note: string) => void
}

const PAIN_TYPES: PainType[] = ['sharp', 'dull', 'burning', 'pressure', 'throbbing']

function getIntensityEmoji(value: number): string {
  if (value <= 2) return '😊'
  if (value <= 4) return '😐'
  if (value <= 6) return '😟'
  if (value <= 8) return '😣'
  return '😭'
}

export default function PainSelector({
  painType,
  intensity,
  freeTextNote,
  onPainTypeChange,
  onIntensityChange,
  onNoteChange,
}: PainSelectorProps) {
  const emoji = getIntensityEmoji(intensity)

  return (
    <div className="pain-selector">
      {/* Pain Type Selector */}
      <fieldset>
        <legend id="pain-type-legend">Pain type</legend>
        <div role="group" aria-labelledby="pain-type-legend" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PAIN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={painType === type}
              onClick={() => onPainTypeChange(type)}
              style={{
                padding: '0.5rem 1rem',
                fontWeight: painType === type ? 'bold' : 'normal',
                border: painType === type ? '2px solid currentColor' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Intensity Slider */}
      <div style={{ marginTop: '1.5rem' }}>
        <label htmlFor="pain-intensity">
          Pain intensity
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <input
            id="pain-intensity"
            type="range"
            min={1}
            max={10}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={intensity}
            aria-valuetext={`${intensity} out of 10 — ${emoji}`}
            style={{ flex: 1 }}
          />
          <span aria-hidden="true" style={{ fontSize: '2rem' }}>{emoji}</span>
          <span style={{ fontWeight: 'bold', minWidth: '3rem' }}>{intensity}/10</span>
        </div>
        <div aria-live="polite" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#555' }}>
          Level {intensity} — {emoji}
        </div>
      </div>

      {/* Free-text Note */}
      <div style={{ marginTop: '1.5rem' }}>
        <label htmlFor="pain-note">
          Additional notes (optional)
        </label>
        <textarea
          id="pain-note"
          value={freeTextNote}
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={200}
          rows={3}
          aria-describedby="pain-note-counter"
          placeholder="Describe your pain in more detail..."
          style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '0.5rem', resize: 'vertical' }}
        />
        <span id="pain-note-counter" aria-live="polite" style={{ fontSize: '0.875rem', color: '#555' }}>
          {freeTextNote.length}/200 characters
        </span>
      </div>
    </div>
  )
}
