// ─── Accessibility Preferences ───────────────────────────────────────────────

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large'
export type ContrastMode = 'normal' | 'high-contrast' | 'dark'
export type FlashIntensity = 'subtle' | 'moderate' | 'strong'
export type DisabilityType = 'deaf' | 'hard-of-hearing' | 'mute' | 'non-verbal' | 'blind' | 'low-vision'
export type CommunicationMode = 'pictogram' | 'text' | 'sign-language' | 'voice'
export type SignLanguage = 'ASL' | 'BSL' | 'ISL'

export interface AccessibilityPreferences {
  fontSize: FontSize
  contrastMode: ContrastMode
  flashIntensity: FlashIntensity
  audioSpeed: number        // 0.5 – 2.0
  voiceGender: 'male' | 'female' | 'neutral'
  voiceLanguage: string     // BCP-47
  ttsEnabled: boolean
  voiceNavigationEnabled: boolean
  disabilityTypes: DisabilityType[]
  preferredCommunicationMode: CommunicationMode
}

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  fontSize: 'medium',
  contrastMode: 'normal',
  flashIntensity: 'moderate',
  audioSpeed: 1.0,
  voiceGender: 'neutral',
  voiceLanguage: 'en-US',
  ttsEnabled: true,
  voiceNavigationEnabled: false,
  disabilityTypes: [],
  preferredCommunicationMode: 'text',
}

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  'small': '14px',
  'medium': '18px',
  'large': '24px',
  'extra-large': '32px',
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string
  displayName: string
  language: string
  disabilityTypes: DisabilityType[]
  preferredCommunicationMode: CommunicationMode
  preferences: AccessibilityPreferences
  emergencyContacts: EmergencyContact[]
  gestureDataConsent: boolean
  analyticsConsent: boolean
  onboardingComplete: boolean
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  email: string
  notificationMethod: 'sms' | 'email' | 'fcm'
}

// ─── AAC / Pictogram ──────────────────────────────────────────────────────────

export type PictogramCategory =
  | 'greetings' | 'needs' | 'emotions' | 'actions'
  | 'food' | 'people' | 'places' | 'activities' | 'emergency'

export interface Pictogram {
  id: string
  label: string
  phrase: string
  category: PictogramCategory
  svgPath: string
  ariaLabel: string
  isCustom: boolean
}

export interface AACBoardConfig {
  userId: string
  pictograms: Pictogram[]
  layout: 'grid-3' | 'grid-4' | 'grid-5'
  ttsOnTap: boolean
}

// ─── Saved Phrases ────────────────────────────────────────────────────────────

export interface SavedPhrase {
  id: string
  text: string      // max 500 chars
  label: string
  order: number
  createdAt?: number  // Unix ms timestamp
}

// ─── Sign Language ────────────────────────────────────────────────────────────

export interface GestureRecognitionResult {
  text: string
  confidence: number
  language: SignLanguage
  timestamp: number
}

// ─── Community Forum ──────────────────────────────────────────────────────────

export interface ForumPost {
  id: string
  authorId: string
  content: string
  attachments: MediaAttachment[]
  reactions: Record<string, string[]>
  flaggedBy: string[]
  isHidden: boolean
  createdAt: number
}

export interface MediaAttachment {
  type: 'image' | 'audio' | 'video'
  url: string
  altText?: string
  captionUrl?: string
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────

export interface PracticeSession {
  id: string
  userId: string
  type: 'sign-language' | 'speech-therapy'
  date: number
  durationSeconds: number
  accuracyScore: number   // 0.0 – 1.0
}

// ─── SOS ─────────────────────────────────────────────────────────────────────

export interface SOSAlert {
  userId: string
  contacts: EmergencyContact[]
  latitude?: number
  longitude?: number
  timestamp: number
  locationAvailable: boolean
}
