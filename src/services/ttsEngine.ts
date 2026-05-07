/**
 * TTS_Engine — wraps Web Speech API SpeechSynthesisUtterance.
 * Respects the `audioMuted` flag from globalStore.
 * If the patient has a ready VoiceProfile with a modelUrl, stores it on the
 * utterance as a custom property for future use (Web Speech API does not
 * natively support custom voice URLs; falls back to default system voice).
 *
 * Requirements: 3.4, 6.4, 9.2, 13.4
 */
import { useGlobalStore } from '../store/globalStore'
import type { VoiceProfile } from '../types'

/** Optional voice profile for the current patient */
let _voiceProfile: VoiceProfile | null = null

/** Set the active patient voice profile (called when profile loads) */
export function setVoiceProfile(profile: VoiceProfile | null): void {
  _voiceProfile = profile
}

function isMuted(): boolean {
  return useGlobalStore.getState().audioMuted
}

/**
 * Speak `text` via Web Speech API unless audio is muted.
 * If a ready VoiceProfile exists, attaches modelUrl as a custom property
 * on the utterance for future custom-voice support.
 */
function speak(text: string): void {
  if (isMuted()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const utterance = new SpeechSynthesisUtterance(text)

  // Attach custom voice model URL for future use (not natively supported)
  if (_voiceProfile?.modelStatus === 'ready' && _voiceProfile.modelUrl) {
    ;(utterance as SpeechSynthesisUtterance & { modelUrl?: string }).modelUrl =
      _voiceProfile.modelUrl
  }

  window.speechSynthesis.speak(utterance)
}

/** Cancel any ongoing speech */
function cancel(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export const ttsEngine = { speak, cancel }
