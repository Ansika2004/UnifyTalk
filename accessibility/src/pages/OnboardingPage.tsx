import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAccessibility } from '../context/AccessibilityContext'
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
  { value: 'pictogram', label: 'Pictogram Board', icon: '🖼' },
  { value: 'text', label: 'Text', icon: '⌨️' },
  { value: 'sign-language', label: 'Sign Language', icon: '🤟' },
  { value: 'voice', label: 'Voice', icon: '🎤' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
]

const TOTAL_STEPS = 5

interface EmergencyContactInput {
  name: string
  phone: string
  email: string
}

// Slide variants: enter from right, exit to left
const slideVariants = {
  enter: { x: '100%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
}

const transition = { type: 'tween', duration: 0.3, ease: 'easeInOut' }

export function OnboardingPage() {
  const navigate = useNavigate()
  const { setPreferences } = useAccessibility()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [selectedDisabilities, setSelectedDisabilities] = useState<DisabilityType[]>([])
  const [selectedMode, setSelectedMode] = useState<CommunicationMode>('text')
  const [language, setLanguage] = useState('en')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('medium')
  const [contrastMode, setContrastMode] = useState<'normal' | 'high-contrast' | 'dark'>('normal')
  const [contacts, setContacts] = useState<EmergencyContactInput[]>([{ name: '', phone: '', email: '' }])
  const [error, setError] = useState<string | null>(null)

  function toggleDisability(type: DisabilityType) {
    setSelectedDisabilities((prev) =>
      prev.includes(type) ? prev.filter((d) => d !== type) : [...prev, type]
    )
  }

  function handleNext() {
    setDirection(1)
    setStep((s) => s + 1)
  }

  function handleBack() {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  function handleComplete() {
    const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim())
    if (validContacts.length === 0) {
      setError('Please add at least one emergency contact with a name and phone number.')
      return
    }
    setError(null)

    const profile = {
      disabilityTypes: selectedDisabilities,
      preferredCommunicationMode: selectedMode,
      language,
      emergencyContacts: validContacts.map((c, i) => ({
        id: `contact-${i}`,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notificationMethod: 'sms' as const,
      })),
      onboardingComplete: true,
    }

    localStorage.setItem('onboarding_profile', JSON.stringify(profile))
    setPreferences({
      fontSize,
      contrastMode,
      disabilityTypes: selectedDisabilities,
      preferredCommunicationMode: selectedMode,
    })
    navigate('/')
  }

  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Progress bar */}
      <div
        className="w-full max-w-lg mb-6"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
      >
        <div className="flex justify-between text-xs mb-1 opacity-60" style={{ color: 'var(--color-text)' }}>
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--color-primary)' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Animated step container */}
      <div className="w-full max-w-lg relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === 0 && (
            <motion.section
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="step0-heading"
            >
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
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer min-h-touch"
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
                    <input
                      type="checkbox"
                      aria-label={opt.label}
                      checked={selectedDisabilities.includes(opt.value)}
                      onChange={() => toggleDisability(opt.value)}
                      className="sr-only"
                    />
                    <span aria-hidden="true">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <button
                aria-label="Go to next step"
                onClick={handleNext}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ background: 'var(--color-primary)', minHeight: '44px' }}
              >
                Next →
              </button>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="step1-heading"
            >
              <h2 id="step1-heading" className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Preferred communication mode:
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-6" role="group" aria-label="Communication modes">
                {COMM_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer min-h-touch"
                    style={{
                      borderColor: selectedMode === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                      background: selectedMode === opt.value ? 'var(--color-primary)' : 'var(--color-bg)',
                      color: selectedMode === opt.value ? '#fff' : 'var(--color-text)',
                    }}
                  >
                    <input
                      type="radio"
                      name="commMode"
                      aria-label={opt.label}
                      checked={selectedMode === opt.value}
                      onChange={() => setSelectedMode(opt.value)}
                      className="sr-only"
                    />
                    <span aria-hidden="true" className="text-3xl mb-1">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  ← Back
                </button>
                <button
                  aria-label="Go to next step"
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'var(--color-primary)', minHeight: '44px' }}
                >
                  Next →
                </button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="step2-heading"
            >
              <h2 id="step2-heading" className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Preferred language:
              </h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language preference"
                className="w-full p-3 rounded-xl border-2 mb-6"
                style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  ← Back
                </button>
                <button
                  aria-label="Go to next step"
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'var(--color-primary)', minHeight: '44px' }}
                >
                  Next →
                </button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="step3-heading"
            >
              <h2 id="step3-heading" className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Display preferences:
              </h2>
              <div className="mb-4">
                <label className="block font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Font size:
                </label>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Font size options">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      aria-pressed={fontSize === s}
                      className="px-3 py-2 rounded-lg border-2 capitalize"
                      style={{
                        minHeight: '44px',
                        borderColor: fontSize === s ? 'var(--color-primary)' : 'var(--color-border)',
                        background: fontSize === s ? 'var(--color-primary)' : 'var(--color-bg)',
                        color: fontSize === s ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {s === 'extra-large' ? 'XL' : s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Contrast:
                </label>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Contrast mode options">
                  {(['normal', 'high-contrast', 'dark'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setContrastMode(m)}
                      aria-pressed={contrastMode === m}
                      className="px-3 py-2 rounded-lg border-2 capitalize"
                      style={{
                        minHeight: '44px',
                        borderColor: contrastMode === m ? 'var(--color-primary)' : 'var(--color-border)',
                        background: contrastMode === m ? 'var(--color-primary)' : 'var(--color-bg)',
                        color: contrastMode === m ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {m === 'high-contrast' ? 'High Contrast' : m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  ← Back
                </button>
                <button
                  aria-label="Go to next step"
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'var(--color-primary)', minHeight: '44px' }}
                >
                  Next →
                </button>
              </div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              aria-labelledby="step4-heading"
            >
              <h2 id="step4-heading" className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Emergency contacts:
              </h2>
              <p className="mb-4 text-sm opacity-70" style={{ color: 'var(--color-text)' }}>
                At least one emergency contact is required to enable SOS.
              </p>
              {contacts.map((contact, i) => (
                <div key={i} className="mb-4 p-3 border-2 rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Contact {i + 1} name
                    <input
                      type="text"
                      aria-label={`Contact ${i + 1} name`}
                      value={contact.name}
                      onChange={(e) => {
                        const updated = [...contacts]
                        updated[i] = { ...updated[i], name: e.target.value }
                        setContacts(updated)
                      }}
                      className="w-full mt-1 p-2 border rounded"
                      style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                    />
                  </label>
                  <label className="block mb-1 text-sm font-semibold mt-2" style={{ color: 'var(--color-text)' }}>
                    Contact {i + 1} phone
                    <input
                      type="tel"
                      aria-label={`Contact ${i + 1} phone`}
                      value={contact.phone}
                      onChange={(e) => {
                        const updated = [...contacts]
                        updated[i] = { ...updated[i], phone: e.target.value }
                        setContacts(updated)
                      }}
                      className="w-full mt-1 p-2 border rounded"
                      style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                    />
                  </label>
                </div>
              ))}

              {error && (
                <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleBack} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ minHeight: '44px', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  ← Back
                </button>
                <button
                  aria-label="Complete onboarding"
                  onClick={handleComplete}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: '#16a34a', minHeight: '44px' }}
                >
                  Get Started ✓
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default OnboardingPage
