# Implementation Plan: UnifyTalk Medical

## Overview

Incremental implementation across 6 phases, each building on the previous. The stack is React 18 + TypeScript + Vite + Zustand + TanStack Query + Firebase (Auth, Firestore, Storage, FCM). External integrations (Claude API, MediaPipe, Google STT/Translate, Web Speech API) are introduced progressively. Every phase ends with a checkpoint.

---

## Tasks

### Phase 1 (Week 1–2): UI Foundation + Navigation

- [x] 1. Bootstrap project and configure tooling
  - Initialize Vite + React 18 + TypeScript project
  - Install and configure: Zustand, TanStack Query, React Router v6, Firebase SDK, i18next
  - Set up ESLint, Prettier, and path aliases
  - Configure Firebase project (Auth, Firestore, Storage, FCM) and add environment variables
  - _Requirements: 7 (platform foundation for all features)_

- [x] 2. Implement global Zustand store and shared types
  - [x] 2.1 Define global store slices: `activeInputMode`, `language`, `audioMuted`, `eyeGazeEnabled`, `highContrast`, `largeFontEnabled`
    - Create `src/store/globalStore.ts` with Zustand
    - Export typed selectors and actions
    - _Requirements: 7.4, 7.5, 5.4_
  - [x] 2.2 Define all shared TypeScript interfaces from the design document
    - Create `src/types/index.ts` with `SOSAlert`, `SymptomReport`, `ChatMessage`, `CheckIn`, `MedicalRecord`, `VitalReading`, `Pictogram`, `VoiceProfile`, `FamilyAccessLink`, `MedicationSchedule`, `DoseEvent`, `NoiseState`, `GazeState`, etc.
    - _Requirements: all modules_

- [x] 3. Implement accessible UI shell and routing
  - [x] 3.1 Create role-based route structure with React Router v6
    - Implement `/patient/*`, `/staff/*`, `/family/:token` route guards
    - Create `PatientShell`, `StaffShell`, and `FamilyShell` layout components
    - _Requirements: 6.7, 14.1_
  - [x] 3.2 Implement global accessibility theme
    - Apply WCAG AAA base styles: minimum 20 px font, 7:1 contrast ratio tokens
    - Implement `highContrast` and `largeFontEnabled` CSS class toggles driven by Zustand store
    - _Requirements: 5.4_
  - [x] 3.3 Implement Firebase Auth integration
    - Patient and Staff sign-in flows
    - Auth state listener wired to route guards
    - _Requirements: 14.1 (auth prerequisite for all protected routes)_

- [x] 4. Implement Language_Detector and i18n foundation
  - [x] 4.1 Implement `LanguageDetector` component
    - Read `navigator.language` on mount, map to supported locale (`en`, `kn`, `hi`, `ta`, `te`, `bn`)
    - Persist selection to Firestore patient preferences and Zustand store
    - _Requirements: 7.1, 7.2_
  - [x] 4.2 Wire i18next with Google Translate API / ML Kit translation
    - Implement `translateContent(text, targetLocale)` utility using ML Kit (preferred) with Google Translate API fallback
    - Ensure language change applies to all visible UI within 1 second without page reload
    - _Requirements: 7.3, 7.5, 7.6_
  - [x] 4.3 Write unit tests for LanguageDetector locale mapping
    - Test all 6 supported locales and fallback to `en`
    - _Requirements: 7.1, 7.2_

- [x] 5. Phase 1 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 2 (Week 3–4): Pictogram Board + Symptom AI

- [x] 6. Implement Pictogram_Board
  - [x] 6.1 Create pictogram data set and category structure
    - Define 76+ `Pictogram` objects across 5 categories: `needs`, `pain`, `emotions`, `food`, `people`
    - Store SVG assets under `public/pictograms/{category}/` matching Firebase Storage paths
    - _Requirements: 13.1_
  - [x] 6.2 Implement `PictogramBoard` component
    - Category tabs, symbol grid (64×64 px minimum icons with text labels), keyword search
    - Composition area at top: add, reorder, remove symbols
    - _Requirements: 13.1, 13.2, 13.3, 13.6, 13.7_
  - [x] 6.3 Integrate AI_Summarizer for pictogram-to-sentence conversion
    - Implement `summarizePictograms(symbols: Pictogram[]): Promise<string>` calling Claude API
    - TTS reads result aloud; deliver natural-language sentence to Doctor_Bridge channel via Firestore
    - _Requirements: 13.4, 13.5_
  - [x] 6.4 Write unit tests for pictogram composition and search
    - Test add/reorder/remove, keyword search filtering, and empty-state handling
    - _Requirements: 13.2, 13.3, 13.7_

- [x] 7. Implement Symptom_Communicator
  - [x] 7.1 Build interactive SVG body diagram
    - Clickable regions: head, neck, chest, abdomen, left arm, right arm, left leg, right leg, back
    - Highlight selected regions; support multi-select
    - _Requirements: 2.1_
  - [x] 7.2 Build pain-type selector and intensity scale
    - Pain type options: sharp, dull, burning, pressure, throbbing
    - Intensity slider 1–10 with emoji faces; free-text note field (max 200 chars)
    - _Requirements: 2.2, 2.3, 2.8_
  - [x] 7.3 Integrate AI_Summarizer for symptom report generation
    - Implement `summarizeSymptoms(report: Omit<SymptomReport, 'aiSummary' | 'fallbackUsed'>): Promise<string>`
    - Format: "Patient reports [pain type] [body region] pain rated [intensity]/10[, note]"
    - Show confirmation screen before sending; fall back to raw structured data on API error
    - _Requirements: 2.4, 2.5, 2.7_
  - [x] 7.4 Persist symptom report to Firestore and deliver to Staff
    - Write `SymptomReport` to `/symptom_reports/{reportId}` with timestamp and patientId
    - Optionally trigger TTS readout of summary
    - _Requirements: 2.6, 2.9_
  - [x] 7.5 Write unit tests for symptom summarizer and fallback logic
    - Test AI success path, API error fallback, and Firestore write
    - _Requirements: 2.4, 2.7, 2.9_

- [x] 8. Phase 2 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 3 (Week 5–6): Sign Language + Voice

- [x] 9. Implement Sign_Language_Translator
  - [x] 9.1 Lazy-load MediaPipe Hands WASM and initialize camera stream
    - Request camera permission; start MediaPipe Hands session at ≥15 fps tracking 21 landmarks per hand
    - Display instructional message and offer Pictogram_Board fallback if camera denied
    - _Requirements: 3.1, 3.8_
  - [x] 9.2 Implement Gesture_Classifier
    - Load TFLite model mapping landmark coordinates to ISL sign labels + confidence scores
    - Vocabulary: pain, water, toilet, medicine, doctor, nurse, help, food, cold, hot, yes, no, sleep, breathe, family (≥15 terms)
    - _Requirements: 3.2_
  - [x] 9.3 Implement phrase buffer and recognition display
    - Confidence ≥ 0.75 → append word to `PhraseBuffer`, display on screen within 500 ms, trigger TTS
    - Confidence < 0.75 → show "Not recognized — please try again" prompt
    - Allow multi-word phrase accumulation; clear or send actions
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  - [x] 9.4 Wire phrase send to Doctor_Bridge channel
    - On "Send", deliver accumulated phrase as `ChatMessage` with `inputModality: 'sign_language'` to Firestore
    - _Requirements: 3.7_
  - [x] 9.5 Write unit tests for Gesture_Classifier confidence thresholding
    - Test accept path (≥0.75), reject path (<0.75), and phrase buffer accumulation
    - _Requirements: 3.3, 3.5, 3.6_

- [x] 10. Implement TTS_Engine and Voice_Profile
  - [x] 10.1 Implement `TTSEngine` service
    - Wrap Web Speech API `SpeechSynthesisUtterance`; respect `audioMuted` Zustand flag
    - If patient has a ready `VoiceProfile`, use the custom model URL instead of system voice
    - _Requirements: 3.4, 6.4, 9.2, 13.4_
  - [x] 10.2 Implement Voice_Profile recording flow
    - Record ≥10 samples of ≥5 s each via `MediaRecorder`; display noise-level quality indicator
    - Reject samples with noise > 50 dB or duration < 5 s; upload accepted samples to Firebase Storage
    - _Requirements: 11.1, 11.4_
  - [x] 10.3 Implement voice model generation and preview
    - Trigger model generation via external TTS API after sufficient samples; poll `modelStatus` in Firestore
    - Preview: type test phrase → play back via custom model; confirm to activate
    - Handle generation failure: notify patient, retain raw recordings for retry
    - _Requirements: 11.2, 11.3, 11.5, 11.6_
  - [x] 10.4 Write unit tests for TTSEngine mute behavior and VoiceProfile sample validation
    - Test mute flag suppresses speech, noise/duration rejection logic
    - _Requirements: 11.4, 3.4_

- [x] 11. Implement Noise_Detector
  - [x] 11.1 Implement `NoiseDetector` using Web Audio API `AnalyserNode`
    - Sample ambient audio every 500 ms; compute dB level; update `NoiseState` in Zustand
    - >65 dB for 3 consecutive samples → switch `activeInputMode` to `touch`; show "Noisy environment — touch mode active"
    - <55 dB for 5 consecutive samples → offer voice re-enable prompt
    - Display persistent microphone quality icon (green/yellow/red)
    - Default to touch mode and hide icon if microphone access denied
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 11.2 Write unit tests for noise threshold state machine
    - Test green/yellow/red transitions, consecutive-sample counters, and mode switching
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 12. Phase 3 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 4 (Week 7–8): Emergency SOS + Doctor Chat

- [x] 13. Implement SOS_Module
  - [x] 13.1 Build fixed-position SOS button
    - 72×72 px minimum touch target; fixed position with z-index above all content; visible on every screen
    - Press-and-hold 2 s with visual countdown ring; < 2 s hold cancels without dispatching alert
    - _Requirements: 1.1, 1.3_
  - [x] 13.2 Implement SOS alert dispatch and retry logic
    - On 2 s hold: call Firebase Cloud Function to dispatch FCM to all staff in patient's ward; write `SOSAlert` to Firestore
    - Retry up to 3 times within 10 s with exponential backoff; display local on-screen alert to patient on send
    - _Requirements: 1.2, 1.6, 1.7_
  - [x] 13.3 Implement emergency message picker
    - After trigger, present ≥5 pre-defined messages: "I can't breathe", "I need pain relief", "I feel dizzy", "I need water", "Call my family"
    - Append selected message to FCM notification payload
    - _Requirements: 1.4, 1.5_
  - [x] 13.4 Write unit tests for SOS hold timer, retry logic, and Firestore audit write
    - Test 2 s threshold, retry counter cap at 3, and audit log fields
    - _Requirements: 1.2, 1.3, 1.6, 1.7_

- [x] 14. Implement Doctor_Bridge chat
  - [x] 14.1 Set up Firestore real-time listener for chat channel
    - Subscribe to `/channels/{channelId}/messages` ordered by timestamp
    - Display assigned staff name and role in chat header
    - Show read receipt indicator when staff views patient message (update `readAt` on staff read)
    - _Requirements: 6.1, 6.6, 6.7_
  - [x] 14.2 Implement patient multi-modal input
    - Typed text input
    - Voice-to-text via Google Speech-to-Text API
    - Pictogram selection (embed `PictogramBoard` in input panel)
    - Sign language input (embed `SignLanguageTranslator` in input panel)
    - Pictogram and sign language inputs pass through AI_Summarizer before delivery
    - _Requirements: 6.2, 6.3_
  - [x] 14.3 Implement staff quick-reply templates
    - Load ≥10 templates from Firestore config: "I'll be there shortly", "Please press the call button", "Your medication is on the way", "The doctor has been notified", "Try to rest", and 5+ more
    - TTS reads incoming staff replies aloud (unless muted)
    - _Requirements: 6.4, 6.5_
  - [x] 14.4 Implement offline message queue
    - Queue outgoing messages in IndexedDB `outbound_messages` store when Firestore is disconnected
    - Sync queue on reconnect; display offline state indicator to patient
    - _Requirements: 6.8_
  - [x] 14.5 Write unit tests for offline queue sync and read receipt update
    - Test message queuing, reconnect flush, and `readAt` timestamp write
    - _Requirements: 6.8, 6.6_

- [x] 15. Phase 4 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 5 (Week 9–10): Mental Health + Medical Records

- [x] 16. Implement Mental_Health_Module
  - [x] 16.1 Implement check-in scheduler and on-demand trigger
    - Schedule check-in prompt every 24 hours using `setInterval` + last-check-in timestamp from Firestore
    - Always-visible on-demand check-in button in patient navigation
    - _Requirements: 4.1_
  - [x] 16.2 Build check-in question UI with three modalities
    - Emoji slider, mood card tap, and voice input (via TTSEngine microphone) per question
    - _Requirements: 4.2_
  - [x] 16.3 Integrate Mood_Analyzer (Claude API) and classification
    - Send structured `CheckInResponse[]` to Claude API; classify into: calm, mild_distress, moderate_distress, severe_distress
    - On moderate/severe: send FCM to staff within 60 s with room number and consecutive-days summary; offer Calm_Corner
    - On API failure: store raw responses in IndexedDB `checkin_drafts`; retry after 5 min
    - _Requirements: 4.3, 4.4, 4.5, 4.7_
  - [x] 16.4 Persist check-in history and display acknowledgment
    - Write `CheckIn` to `/checkins/{checkinId}`; retain ≥30 days per patient
    - Display affirming acknowledgment message after completion
    - _Requirements: 4.6, 4.8_
  - [x] 16.5 Write unit tests for Mood_Analyzer classification routing and retry logic
    - Test each classification level, FCM trigger threshold, and IndexedDB retry path
    - _Requirements: 4.3, 4.4, 4.7_

- [x] 17. Implement Records_Viewer
  - [x] 17.1 Implement hospital API connector and PDF upload
    - Configurable REST endpoint for hospital records; PDF upload to Firebase Storage at `/records/{patientId}/{recordId}.pdf`
    - _Requirements: 5.1_
  - [x] 17.2 Integrate AI_Summarizer for plain-language record summaries
    - Call Claude API to replace medical jargon; display both plain-language summary and original document toggle
    - Show record date, ordering doctor, and test type in prominent header
    - _Requirements: 5.2, 5.6_
  - [x] 17.3 Implement accessibility controls and filtering
    - TTS button to read plain-language summary aloud
    - High-contrast (7:1) and large-font (≥20 px) toggles persisted to patient preferences
    - Filter by date range, test type, and ordering doctor
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 17.4 Implement offline cache with freshness indicator
    - Cache last successful records in Firestore `/records/{recordId}` with `cachedAt` timestamp
    - Display stale-data indicator and last-updated timestamp when API unavailable
    - _Requirements: 5.7_
  - [x] 17.5 Write unit tests for cache fallback and filter logic
    - Test API error → cached records display, date/type/doctor filter combinations
    - _Requirements: 5.5, 5.7_

- [x] 18. Phase 5 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 6 (Week 11–12): Extra Features + Polish

- [x] 19. Implement Eye_Gaze_Controller
  - [x] 19.1 Initialize MediaPipe Face Mesh and gaze tracking
    - Lazy-load Face Mesh WASM; activate front-facing camera at ≥15 fps
    - Calibration prompt on first use; recalibration accessible from settings
    - Fall back to touch input and display error if camera unavailable or Face Mesh fails
    - _Requirements: 10.1, 10.5, 10.6_
  - [x] 19.2 Implement blink and gaze gesture recognition
    - Double-blink (2 blinks within 600 ms) → select focused element
    - Sustained left gaze (1 s) → navigate back; sustained right gaze (1 s) → navigate forward
    - Highlight focused element with ≥3 px focus ring in high-contrast color
    - _Requirements: 10.2, 10.3, 10.4_
  - [x] 19.3 Write unit tests for blink detection timing and gaze direction thresholds
    - Test double-blink window (600 ms), single-blink rejection, and 1 s gaze hold
    - _Requirements: 10.2, 10.3_

- [x] 20. Implement Medication_Reminder
  - [x] 20.1 Build full-screen reminder notification
    - Display medication name, dosage, and instructions at scheduled time; TTS reads aloud
    - "Taken" → write `DoseEvent` with `status: 'taken'` and timestamp; dismiss reminder
    - "Need Nurse" → send FCM to assigned staff; display confirmation to patient
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 20.2 Implement missed-dose timeout and staff compliance log
    - 15-minute no-response timeout → re-display once + write `DoseEvent` with `status: 'missed'`
    - Staff dashboard compliance log: confirmed doses, missed doses, nurse-assist requests, filterable by date
    - _Requirements: 9.5, 9.6_
  - [x] 20.3 Write unit tests for dose timeout logic and compliance log filtering
    - Test 15-minute timer, re-display once behavior, and missed-dose Firestore write
    - _Requirements: 9.5, 9.6_

- [x] 21. Implement Vitals_Dashboard
  - [x] 21.1 Build vitals polling and display
    - Poll hospital API every ≤30 s; display heart rate (bpm), SpO₂ (%), and temperature (°C)
    - Color-code: green (normal range), yellow (±10%), red (>10% outside normal)
    - Reassuring plain-language labels for green values (e.g., "Your oxygen is 98% — that's great")
    - Read-only; no controls affecting monitoring equipment
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 21.2 Implement stale-data fallback
    - Cache last readings in `/vitals_cache/{patientId}`; display "Last updated [timestamp]" and stale indicator when API unavailable
    - _Requirements: 12.6_
  - [x] 21.3 Write unit tests for color-coding thresholds and stale-data display
    - Test boundary values at ±10% for each vital type and cache fallback trigger
    - _Requirements: 12.2, 12.6_

- [x] 22. Implement Family_Connect
  - [x] 22.1 Implement access link generation and token validation
    - Patient or staff generates UUID token via Cloud Function; valid for ≤72 hours
    - Token-validated `/family/:token` route; Cloud Function validates expiry and revocation
    - Log link generation, login, and messages sent to `/audit_log`
    - _Requirements: 14.1, 14.7_
  - [x] 22.2 Build family read-only view and messaging
    - Display mood check-in history, medication compliance, and Doctor_Bridge chat per `consentSettings`
    - No access to raw records, vitals, or clinical notes
    - Family message input (≤160 chars); deliver to patient with distinct visual style; TTS reads aloud optionally
    - _Requirements: 14.2, 14.3, 14.4, 14.5_
  - [x] 22.3 Implement link revocation and session termination
    - Revocation via Cloud Function sets `revokedAt`; active family sessions listen to Firestore and terminate immediately
    - _Requirements: 14.6_
  - [x] 22.4 Write unit tests for token expiry, revocation, and consent-gated data access
    - Test expired token rejection, revocation listener, and each consent flag combination
    - _Requirements: 14.1, 14.5, 14.6_

- [x] 23. Implement Calm_Corner
  - [x] 23.1 Build audio player and breathing exercise UI
    - ≥3 soothing audio tracks via Web Audio API with play/pause/volume controls
    - ≥2 guided breathing animations (CSS/SVG) with 4/6/8 s configurable cycle durations
    - Optional TTS narration of inhale/exhale cues; sleep timer (15/30/60 min)
    - Accessible from main navigation at all times, including during SOS or chat sessions
    - SOS button and staff messages remain active during playback
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x] 23.2 Write unit tests for sleep timer and SOS non-suppression during playback
    - Test timer durations, auto-stop behavior, and SOS button visibility/functionality during audio
    - _Requirements: 15.5, 15.6_

- [x] 24. Final integration and wiring
  - [x] 24.1 Wire all modules into PatientShell navigation
    - Integrate SOS_Module (fixed overlay), Calm_Corner, Doctor_Bridge, Pictogram_Board, Symptom_Communicator, Sign_Language_Translator, Mental_Health_Module, Records_Viewer, Medication_Reminder, Vitals_Dashboard, Eye_Gaze_Controller, Voice_Profile, Noise_Detector, Language_Detector into unified patient navigation
    - Ensure SOS button z-index and visibility is preserved across all routes
    - _Requirements: 1.1, 15.1, 15.6_
  - [x] 24.2 Wire StaffShell dashboard
    - Incoming SOS alerts, Doctor_Bridge chat view, symptom report inbox, mood distress notifications, medication compliance log
    - Quick-reply templates loaded from Firestore config
    - _Requirements: 1.2, 2.6, 4.4, 6.5, 9.6_
  - [x] 24.3 Audit offline resilience across all modules
    - Verify IndexedDB queues for Doctor_Bridge, check-in drafts, and SOS retries function correctly end-to-end
    - _Requirements: 6.8, 4.7, 1.6_
  - [x] 24.4 Write integration tests for critical patient flows
    - SOS dispatch → staff FCM → audit log
    - Symptom report → AI summary → staff delivery
    - Doctor_Bridge offline queue → reconnect sync
    - _Requirements: 1.2, 1.7, 2.4, 2.9, 6.8_

- [x] 25. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design document (design.md) contains all TypeScript interfaces — reference it during implementation
- MediaPipe WASM modules (Hands, Face Mesh) must be lazy-loaded to avoid blocking initial render
- All AI calls (Claude API) must have fallback paths as specified in requirements
- On-device ML Kit translation is preferred over Google Translate API per Requirement 7.6
