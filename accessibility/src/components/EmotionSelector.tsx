// Requirements: 7.1, 7.2, 7.3
import { useCallback } from 'react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { ttsEngine, syncTTSPreferences } from '@/services/ttsEngine'

export interface Emotion {
  id: string
  label: string
  emoji: string
}

export const EMOTIONS: Emotion[] = [
  { id: 'happy',      label: 'Happy',      emoji: '😊' },
  { id: 'sad',        label: 'Sad',        emoji: '😢' },
  { id: 'angry',      label: 'Angry',      emoji: '😠' },
  { id: 'confused',   label: 'Confused',   emoji: '😕' },
  { id: 'excited',    label: 'Excited',    emoji: '🤩' },
  { id: 'tired',      label: 'Tired',      emoji: '😩' },
  { id: 'anxious',    label: 'Anxious',    emoji: '😰' },
  { id: 'grateful',   label: 'Grateful',   emoji: '🥹' },
  { id: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { id: 'calm',       label: 'Calm',       emoji: '😌' },
  { id: 'surprised',  label: 'Surprised',  emoji: '😲' },
  { id: 'in-pain',    label: 'In Pain',    emoji: '😣' },
  { id: 'scared',     label: 'Scared',     emoji: '😨' },
  { id: 'lonely',     label: 'Lonely',     emoji: '🥺' },
]

interface EmotionSelectorProps {
  onSelect?: (label: string) => void
  selectedLabel?: string
}

export function EmotionSelector({ onSelect, selectedLabel }: EmotionSelectorProps) {
  const { preferences } = useAccessibility()
  syncTTSPreferences(preferences.ttsEnabled, preferences.audioSpeed)

  const handleSelect = useCallback(
    (emotion: Emotion) => {
      onSelect?.(emotion.label)
      if (preferences.ttsEnabled) {
        ttsEngine.speak(`I feel ${emotion.label}`)
      }
    },
    [onSelect, preferences.ttsEnabled],
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">How are you feeling?</h2>

      {selectedLabel && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-blue-900 font-medium"
        >
          I feel {selectedLabel}
        </div>
      )}

      <div
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
        role="group"
        aria-label="Emotion selector"
      >
        {EMOTIONS.map((emotion) => (
          <button
            key={emotion.id}
            onClick={() => handleSelect(emotion)}
            aria-label={emotion.label}
            aria-pressed={selectedLabel === emotion.label}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              selectedLabel === emotion.label
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300'
            }`}
          >
            <span
              aria-hidden="true"
              className="text-4xl leading-none"
              style={{ minWidth: 48, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {emotion.emoji}
            </span>
            <span className="text-xs text-center text-gray-700">{emotion.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
