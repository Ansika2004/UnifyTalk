import { create } from 'zustand'
import {
  type AccessibilityPreferences,
  type DisabilityType,
  type CommunicationMode,
  DEFAULT_PREFERENCES,
} from '../types'

// Font size px values
export const FONT_SIZE_MAP: Record<AccessibilityPreferences['fontSize'], string> = {
  'small': '14px',
  'medium': '18px',
  'large': '24px',
  'extra-large': '32px',
}

interface AccessibilityStore {
  preferences: AccessibilityPreferences
  isLoaded: boolean

  setPreferences: (prefs: Partial<AccessibilityPreferences>) => void
  setFontSize: (size: AccessibilityPreferences['fontSize']) => void
  setContrastMode: (mode: AccessibilityPreferences['contrastMode']) => void
  setAudioSpeed: (speed: number) => void
  setTtsEnabled: (enabled: boolean) => void
  setDisabilityTypes: (types: DisabilityType[]) => void
  setPreferredCommunicationMode: (mode: CommunicationMode) => void
  loadDefaults: () => void
  markLoaded: () => void
}

export const useAccessibilityStore = create<AccessibilityStore>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  isLoaded: false,

  setPreferences: (prefs) =>
    set((s) => ({ preferences: { ...s.preferences, ...prefs } })),

  setFontSize: (size) =>
    set((s) => ({ preferences: { ...s.preferences, fontSize: size } })),

  setContrastMode: (mode) =>
    set((s) => ({ preferences: { ...s.preferences, contrastMode: mode } })),

  setAudioSpeed: (speed) =>
    set((s) => ({ preferences: { ...s.preferences, audioSpeed: speed } })),

  setTtsEnabled: (enabled) =>
    set((s) => ({ preferences: { ...s.preferences, ttsEnabled: enabled } })),

  setDisabilityTypes: (types) =>
    set((s) => ({ preferences: { ...s.preferences, disabilityTypes: types } })),

  setPreferredCommunicationMode: (mode) =>
    set((s) => ({ preferences: { ...s.preferences, preferredCommunicationMode: mode } })),

  loadDefaults: () =>
    set({ preferences: DEFAULT_PREFERENCES, isLoaded: true }),

  markLoaded: () => set({ isLoaded: true }),
}))
