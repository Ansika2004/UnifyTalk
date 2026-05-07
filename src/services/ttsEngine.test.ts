/**
 * Unit tests for TTSEngine mute behavior.
 * Requirements: 3.4, 11.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGlobalStore } from '../store/globalStore'

// Mock window.speechSynthesis and SpeechSynthesisUtterance before importing ttsEngine
const mockSpeak = vi.fn()
const mockCancel = vi.fn()

vi.stubGlobal('speechSynthesis', {
  speak: mockSpeak,
  cancel: mockCancel,
})

// Stub SpeechSynthesisUtterance (not available in happy-dom)
class MockSpeechSynthesisUtterance {
  text: string
  onend: (() => void) | null = null
  constructor(text: string) {
    this.text = text
  }
}
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)

// Import after stubbing globals
const { ttsEngine } = await import('./ttsEngine')

beforeEach(() => {
  mockSpeak.mockClear()
  mockCancel.mockClear()
  // Reset store to defaults (not muted)
  useGlobalStore.setState({ audioMuted: false })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ttsEngine.speak', () => {
  it('calls speechSynthesis.speak when not muted', () => {
    // Requirements: 3.4
    useGlobalStore.setState({ audioMuted: false })
    ttsEngine.speak('Hello')
    expect(mockSpeak).toHaveBeenCalledOnce()
    expect(mockSpeak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello' }))
  })

  it('does NOT call speechSynthesis.speak when audioMuted is true', () => {
    // Requirements: 3.4
    useGlobalStore.setState({ audioMuted: true })
    ttsEngine.speak('Hello')
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('passes the correct text to SpeechSynthesisUtterance', () => {
    // Requirements: 3.4
    useGlobalStore.setState({ audioMuted: false })
    ttsEngine.speak('pain')
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance.text).toBe('pain')
  })
})

describe('ttsEngine.cancel', () => {
  it('calls speechSynthesis.cancel', () => {
    // Requirements: 3.4
    ttsEngine.cancel()
    expect(mockCancel).toHaveBeenCalledOnce()
  })
})
