import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccessibilityStore } from '../store/accessibilityStore'
import type { DisabilityType, CommunicationMode } from '../types'

const DISABILITY_OPTIONS: { value: DisabilityType; label: string; icon: string }[] = [
  { value: 'deaf', label: 'Deaf', icon: '🦻' },
  { value: 'hard-of-hearing', label: 'Hard of Hearing', icon: '👂' },
  { value: 'mute', label: 'Mute', icon: '🤐' },
  { value: 'non-verbal', label: 'Non-verbal', icon: '💬' },
  { value: 'blind', label: 'Blind', icon: '👁️' },
  { value: 'low-vision', label: 'Low Vision', icon: '🔍' },
]

const COMM_OPTIONS: { value: CommunicationMode; label: string; icon: string }[] = [
  { value: 'pictogram', label: 'Pictograms', icon: '🖼' },
  { value: 'text', label: 'Text', icon: '⌨️' },
  { value: 'sign-language', label: 'Sign Language', icon: '🤟' },
  { value: 'voice', label: 'Voice', icon: '🎤' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setDisabilityTypes, setPreferredCommunicationMode, setFontSize, setContrastMode, markLoaded } =
    useAccessibilityStore()

  const [step, setStep] = useState(0)
  const [selectedDisabilities, setSelectedDisabilities] = useState<DisabilityType[]>([])
  const [selectedMode, setSelectedMode] = useState<CommunicationMode>('text')

  function toggleDisability(type: DisabilityType) {
    setSelectedDisabilities((prev) =>
      prev.includes(type) ? prev.filter((d) => d !== type) : [...prev, type]
    )
  }

  function handleFinish() {
    setDisabilityTypes(selectedDisabilities)
    setPreferredCommunicationMode(selectedMode)
    markLoaded()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
      {step === 0 && (
        <section aria-labelledby="step0-heading">
          <h1 id="step0-heading" className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Welcome to UnifyTalk
          </h1>
          <p className="mb-6 opacity-70" style={{ color: 'var(--color-text)' }}>
            Let's set up your communication preferences.
          </p>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Select your disability type(s):
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-6" role="group" aria-label="Disability types">
            {DISABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleDisability(opt.value)}
                aria-pressed={selectedDisabilities.includes(opt.value)}
                className="flex items-center gap-2 p-3 rounded-xl border-2 min-h-touch"
                style={{
                  borderColor: selectedDisabilities.includes(opt.value)
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                  background: selectedDisabilities.includes(opt.value)
                    ? 'var(--color-primary)'
                    : 'var(--color-bg)',
                  color: selectedDisabilities.includes(opt.value) ? '#fff' : 'var(--color-text)',
                }}
              >
                <span aria-hidden="true">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--color-primary)', minHeight: '44px' }}
          >
            Next
          </button>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="step1-heading">
          <h2 id="step1-heading" className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Preferred communication mode:
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-6" role="group" aria-label="Communication modes">
            {COMM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedMode(opt.value)}
                aria-pressed={selectedMode === opt.value}
                className="flex flex-col items-center p-4 rounded-xl border-2 min-h-touch"
                style={{
                  borderColor: selectedMode === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                  background: selectedMode === opt.value ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: selectedMode === opt.value ? '#fff' : 'var(--color-text)',
                }}
              >
                <span aria-hidden="true" className="text-3xl mb-1">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--color-primary)', minHeight: '44px' }}
          >
            Next
          </button>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2-heading">
          <h2 id="step2-heading" className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Display preferences:
          </h2>
          <div className="mb-4">
            <label className="block font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Font size:
            </label>
            <div className="flex gap-2" role="group" aria-label="Font size options">
              {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className="px-3 py-2 rounded-lg border-2 min-h-touch capitalize"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {size === 'extra-large' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label className="block font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Contrast mode:
            </label>
            <div className="flex gap-2" role="group" aria-label="Contrast mode options">
              {(['normal', 'high-contrast', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setContrastMode(mode)}
                  className="px-3 py-2 rounded-lg border-2 min-h-touch capitalize"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {mode === 'high-contrast' ? 'High Contrast' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--color-primary)', minHeight: '44px' }}
          >
            Get Started
          </button>
        </section>
      )}
    </div>
  )
}
