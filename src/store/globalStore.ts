import { create } from 'zustand'

// Supported locales per Requirement 7.2
export type SupportedLocale = 'en' | 'kn' | 'hi' | 'ta' | 'te' | 'bn'

// Input modes per Requirement 8.2 (Noise_Detector switches between voice/touch)
export type InputMode = 'voice' | 'touch'

export interface GlobalState {
  // Active input modality — switched by Noise_Detector (Req 8.2) or user preference
  activeInputMode: InputMode

  // Current UI language (Req 7.4, 7.5)
  language: SupportedLocale

  // Whether TTS/audio output is muted (Req 3.4, 6.4, 9.2)
  audioMuted: boolean

  // Whether Eye_Gaze_Controller is active (Req 10.1)
  eyeGazeEnabled: boolean

  // Whether high-contrast mode (7:1 ratio) is active (Req 5.4)
  highContrast: boolean

  // Whether large-font mode (≥20 px base) is active (Req 5.4)
  largeFontEnabled: boolean
}

export interface GlobalActions {
  setActiveInputMode: (mode: InputMode) => void
  setLanguage: (locale: SupportedLocale) => void
  setAudioMuted: (muted: boolean) => void
  toggleAudioMuted: () => void
  setEyeGazeEnabled: (enabled: boolean) => void
  toggleEyeGazeEnabled: () => void
  setHighContrast: (enabled: boolean) => void
  toggleHighContrast: () => void
  setLargeFontEnabled: (enabled: boolean) => void
  toggleLargeFontEnabled: () => void
}

export type GlobalStore = GlobalState & GlobalActions

const initialState: GlobalState = {
  activeInputMode: 'touch',
  language: 'en',
  audioMuted: false,
  eyeGazeEnabled: false,
  highContrast: false,
  largeFontEnabled: false,
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  ...initialState,

  setActiveInputMode: (mode) => set({ activeInputMode: mode }),

  setLanguage: (locale) => set({ language: locale }),

  setAudioMuted: (muted) => set({ audioMuted: muted }),
  toggleAudioMuted: () => set((s) => ({ audioMuted: !s.audioMuted })),

  setEyeGazeEnabled: (enabled) => set({ eyeGazeEnabled: enabled }),
  toggleEyeGazeEnabled: () => set((s) => ({ eyeGazeEnabled: !s.eyeGazeEnabled })),

  setHighContrast: (enabled) => set({ highContrast: enabled }),
  toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),

  setLargeFontEnabled: (enabled) => set({ largeFontEnabled: enabled }),
  toggleLargeFontEnabled: () => set((s) => ({ largeFontEnabled: !s.largeFontEnabled })),
}))

// ---------------------------------------------------------------------------
// Typed selectors — use these in components to avoid re-renders on unrelated
// state changes (each selector subscribes to only one slice of state).
// ---------------------------------------------------------------------------

export const selectActiveInputMode = (s: GlobalStore): InputMode => s.activeInputMode
export const selectLanguage = (s: GlobalStore): SupportedLocale => s.language
export const selectAudioMuted = (s: GlobalStore): boolean => s.audioMuted
export const selectEyeGazeEnabled = (s: GlobalStore): boolean => s.eyeGazeEnabled
export const selectHighContrast = (s: GlobalStore): boolean => s.highContrast
export const selectLargeFontEnabled = (s: GlobalStore): boolean => s.largeFontEnabled

// Action selectors
export const selectSetActiveInputMode = (s: GlobalStore) => s.setActiveInputMode
export const selectSetLanguage = (s: GlobalStore) => s.setLanguage
export const selectSetAudioMuted = (s: GlobalStore) => s.setAudioMuted
export const selectToggleAudioMuted = (s: GlobalStore) => s.toggleAudioMuted
export const selectSetEyeGazeEnabled = (s: GlobalStore) => s.setEyeGazeEnabled
export const selectToggleEyeGazeEnabled = (s: GlobalStore) => s.toggleEyeGazeEnabled
export const selectSetHighContrast = (s: GlobalStore) => s.setHighContrast
export const selectToggleHighContrast = (s: GlobalStore) => s.toggleHighContrast
export const selectSetLargeFontEnabled = (s: GlobalStore) => s.setLargeFontEnabled
export const selectToggleLargeFontEnabled = (s: GlobalStore) => s.toggleLargeFontEnabled
