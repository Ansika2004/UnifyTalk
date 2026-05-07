// TTS Engine — wraps Web Speech API SpeechSynthesis
// Reads ttsEnabled and audioSpeed from AccessibilityContext via a shared ref
// that components update when preferences change.

let _ttsEnabled = true
let _audioSpeed = 1.0

/** Called by components to sync preferences into the engine */
export function syncTTSPreferences(ttsEnabled: boolean, audioSpeed: number): void {
  _ttsEnabled = ttsEnabled
  _audioSpeed = audioSpeed
}

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis
  }
  return null
}

export const ttsEngine = {
  speak(text: string, rate?: number): void {
    if (!_ttsEnabled) return
    const synth = getSynthesis()
    if (!synth) return
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate ?? _audioSpeed
    synth.speak(utterance)
  },

  cancel(): void {
    getSynthesis()?.cancel()
  },

  getVoices(): SpeechSynthesisVoice[] {
    return getSynthesis()?.getVoices() ?? []
  },
}
