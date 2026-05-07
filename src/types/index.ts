import type { Timestamp } from 'firebase/firestore'

// SOS_Module
export interface SOSAlert {
  patientId: string
  wardId: string
  timestamp: Timestamp
  selectedMessage: string
  deliveryStatus: 'pending' | 'delivered' | 'failed'
  retryCount: number
}

// Symptom_Communicator
export type BodyRegion =
  | 'head'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'right_leg'
  | 'back'

export type PainType = 'sharp' | 'dull' | 'burning' | 'pressure' | 'throbbing'

export interface SymptomReport {
  patientId: string
  timestamp: Timestamp
  bodyRegions: BodyRegion[]
  painType: PainType
  intensity: number // 1–10
  freeTextNote?: string // max 200 chars
  aiSummary: string
  fallbackUsed: boolean
}

// Doctor_Bridge
export interface ChatMessage {
  messageId: string
  channelId: string
  senderId: string
  senderRole: 'patient' | 'staff'
  content: string
  inputModality: 'text' | 'voice' | 'pictogram' | 'sign_language'
  timestamp: Timestamp
  readAt?: Timestamp
}

// Mental_Health_Module
export interface CheckInResponse {
  questionId: string
  modality: 'emoji_slider' | 'mood_card' | 'voice'
  value: string | number
}

export interface CheckIn {
  patientId: string
  timestamp: Timestamp
  responses: CheckInResponse[]
  classification: 'calm' | 'mild_distress' | 'moderate_distress' | 'severe_distress'
  notificationSent: boolean
}

// Records_Viewer
export interface MedicalRecord {
  recordId: string
  patientId: string
  date: Timestamp
  orderingDoctor: string
  testType: string
  originalUrl?: string
  plainLanguageSummary: string
  cachedAt: Timestamp
}

// Vitals_Dashboard
export interface VitalReading {
  type: 'heart_rate' | 'spo2' | 'temperature'
  value: number
  unit: string
  normalRange: [number, number]
  status: 'normal' | 'warning' | 'critical'
  timestamp: Timestamp
}

// Pictogram_Board
export type PictogramCategory = 'needs' | 'pain' | 'emotions' | 'food' | 'people'

export interface Pictogram {
  id: string
  category: PictogramCategory
  label: string
  iconUrl: string
  keywords: string[]
}

export interface PictogramMessage {
  symbols: Pictogram[]
  naturalLanguage: string
}

// Voice_Profile
export interface VoiceSample {
  sampleId: string
  storageUrl: string
  durationSeconds: number
  noiseLevel: number
  recordedAt: Timestamp
  accepted: boolean
}

export interface VoiceProfile {
  patientId: string
  samples: VoiceSample[]
  modelStatus: 'pending' | 'processing' | 'ready' | 'failed'
  modelUrl?: string
}

// Family_Connect
export interface FamilyConsentSettings {
  showMoodHistory: boolean
  showMedicationCompliance: boolean
  showChatHistory: boolean
}

export interface FamilyAccessLink {
  token: string
  patientId: string
  createdBy: string
  expiresAt: Timestamp
  revokedAt?: Timestamp
  consentSettings: FamilyConsentSettings
}

// Medication_Reminder
export interface MedicationSchedule {
  medicationId: string
  patientId: string
  name: string
  dosage: string
  instructions: string
  scheduledTimes: string[] // HH:mm
}

export interface DoseEvent {
  medicationId: string
  patientId: string
  scheduledTime: Timestamp
  status: 'taken' | 'missed' | 'nurse_requested'
  confirmedAt?: Timestamp
}

// Noise_Detector
export interface NoiseState {
  currentDb: number
  level: 'green' | 'yellow' | 'red'
  consecutiveSamplesAbove65: number
  consecutiveSamplesBelow55: number
  activeMode: 'voice' | 'touch'
}

// Eye_Gaze_Controller
export interface GazeState {
  focusedElementId: string | null
  gazeDirection: 'left' | 'right' | 'center' | null
  gazeStartTime: number | null
  blinkHistory: number[]
}

// Sign_Language_Translator
export interface GestureResult {
  sign: string
  confidence: number
  timestamp: number
}

export interface PhraseBuffer {
  words: string[]
  maxLength: number
}
