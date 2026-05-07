go# Implementation Tasks: UnifyTalk Accessible Communication Platform

## Phase 1: Accessible UI Foundation (Week 1–2)

- [x] 1.1 Initialize React 18 + Vite + Tailwind CSS + Framer Motion project with TypeScript
  - [x] 1.1.1 Configure Tailwind with custom design tokens (font sizes 14/18/24/32px, high-contrast color palette)
  - [x] 1.1.2 Set up React Router DOM 6 with route structure for all 6 phases
  - [x] 1.1.3 Configure PWA manifest, service worker (Workbox), and offline caching strategy
  - [x] 1.1.4 Set up Firebase project (Auth, Firestore, Storage, FCM) and `src/firebase.ts`

- [x] 1.2 Implement AccessibilityProvider global context
  - [x] 1.2.1 Define `AccessibilityPreferences` interface and default values
  - [x] 1.2.2 Implement font size CSS variable injection (14/18/24/32px) on preference change
  - [x] 1.2.3 Implement high-contrast and dark mode theme switching without page reload
  - [x] 1.2.4 Persist preferences to Firestore `users/{userId}/preferences` and IndexedDB cache
  - [x] 1.2.5 Load and apply saved preferences on login (Requirement 1.2)
  - [x] 1.2.6 Apply default accessible configuration when profile cannot be loaded (Requirement 1.4)

- [x] 1.3 Build Accessible UI Shell and Bottom Navigation
  - [x] 1.3.1 Implement bottom navigation bar with ARIA roles and keyboard tab support
  - [x] 1.3.2 Add persistent SOS button visible on all pages (floating action button)
  - [x] 1.3.3 Add persistent AI Assistant entry point visible on all pages
  - [x] 1.3.4 Implement skip-to-content link for keyboard/screen reader users
  - [x] 1.3.5 Implement swipe gesture navigation (left/right) between primary sections

- [x] 1.4 Build Onboarding Flow
  - [x] 1.4.1 Disability type selector (Deaf/HoH, Mute/Non-verbal, Blind/Low Vision, combinations)
  - [x] 1.4.2 Preferred communication mode selector (pictogram, text, sign language, voice)
  - [x] 1.4.3 Language preference selector (BCP-47)
  - [x] 1.4.4 Accessibility preferences setup screen (font size, contrast, audio speed)
  - [x] 1.4.5 Save completed onboarding profile to Firestore `users/{userId}/profile`
  - [x] 1.4.6 Emergency contact setup screen (minimum 1 required to enable SOS)

- [x] 1.5 Build Home Dashboard
  - [x] 1.5.1 Feature tiles linking to all primary sections, sized for touch (min 44×44px)
  - [x] 1.5.2 Quick-access panel showing last-used features
  - [x] 1.5.3 Accessibility settings shortcut in header

- [x] 1.6 Write Phase 1 tests
  - [x] 1.6.1 PBT — Property 1: User profile round trip (fast-check, 100 iterations)
  - [x] 1.6.2 PBT — Property 2: Accessibility settings propagation (fast-check, 100 iterations)
  - [x] 1.6.3 Unit — AccessibilityProvider applies correct CSS variables for each font size
  - [x] 1.6.4 Unit — Default config applied when Firestore profile load fails

---

## Phase 2: Communication Core (Week 3–4)

- [x] 2.1 Build AAC Pictogram Board
  - [x] 2.1.1 Load and display 100+ pictograms from `public/pictograms/` across 9 categories
  - [x] 2.1.2 Implement category tabs with ARIA labels and keyboard navigation
  - [x] 2.1.3 Implement pictogram tap handler: display phrase text + optional TTS output
  - [x] 2.1.4 Add, edit, and remove custom pictograms (CRUD with Firestore persistence)
  - [x] 2.1.5 Save/load AAC board configuration to `users/{userId}/aacBoardConfig`
  - [x] 2.1.6 Cache full pictogram dataset in IndexedDB for offline use
  - [x] 2.1.7 Ensure all pictogram elements have `aria-label` and visible text labels

- [x] 2.2 Build Claude API Sentence Generation for Pictograms
  - [x] 2.2.1 Implement service that sends selected pictogram sequence to Claude API
  - [x] 2.2.2 Display generated sentence in output area with TTS trigger
  - [x] 2.2.3 Implement offline fallback: concatenate pictogram phrases when Claude unavailable

- [x] 2.3 Build TTS Engine
  - [x] 2.3.1 Implement unified TTS service with ElevenLabs primary and Web Speech API fallback
  - [x] 2.3.2 Build Type-to-Speak panel: text input → speak button → audio output
  - [x] 2.3.3 Build Quick Speak panel with 20 pre-loaded common phrases
  - [x] 2.3.4 Implement voice selector (gender, language, speech rate, volume boost)
  - [x] 2.3.5 Apply speech rate from AccessibilityPreferences to all TTS calls
  - [x] 2.3.6 Retain typed text on TTS failure and display descriptive error (Requirement 4.4)

- [x] 2.4 Build Pre-saved Phrases Manager
  - [x] 2.4.1 UI to create, edit, reorder, and delete saved phrases
  - [x] 2.4.2 Enforce 100-phrase limit with user-facing error on exceed
  - [x] 2.4.3 Enforce 500-character limit per phrase with validation error
  - [x] 2.4.4 One-tap phrase insertion into active text input within 200ms
  - [x] 2.4.5 Persist phrases to `users/{userId}/savedPhrases` and IndexedDB cache

- [x] 2.5 Build Emotion Selector
  - [x] 2.5.1 Display grid of ≥ 12 emotion icons with visible text labels
  - [x] 2.5.2 Each icon must have `aria-label` matching the visible label
  - [x] 2.5.3 Emotion tap handler: display label text + optional TTS

- [x] 2.6 Write Phase 2 tests
  - [x] 2.6.1 PBT — Property 7: Pictogram tap phrase correctness (fast-check, 100 iterations)
  - [x] 2.6.2 PBT — Property 8: AAC board CRUD round trip (fast-check, 100 iterations)
  - [x] 2.6.3 PBT — Property 9: Pre-saved phrase limit and insertion (fast-check, 100 iterations)
  - [x] 2.6.4 PBT — Property 10: Emotion icon accessibility (fast-check, 100 iterations)
  - [x] 2.6.5 PBT — Property 6: TTS speech rate propagation (fast-check, 100 iterations)
  - [x] 2.6.6 Unit — AAC board renders all 9 categories with correct ARIA labels
  - [x] 2.6.7 Unit — TTS failure retains input text and shows error message

---

## Phase 3: Sign Language + Live Captions (Week 5–6)

- [x] 3.1 Integrate MediaPipe Hands for Sign Language Recognition
  - [x] 3.1.1 Load MediaPipe Hands WASM and initialize camera feed
  - [x] 3.1.2 Implement ISL and ASL fingerspelling recognition
  - [x] 3.1.3 Implement word-level gesture recognition for common signs
  - [x] 3.1.4 Display recognized text with confidence indicator in output area
  - [x] 3.1.5 Show retry prompt when confidence < threshold (default 0.7) (Requirement 2.4)
  - [x] 3.1.6 Language selector for ASL / BSL / ISL (Requirement 2.2)

- [x] 3.2 Implement Gesture Dataset Collection
  - [x] 3.2.1 Consent gate: only collect gesture data when `gestureDataConsent = true`
  - [x] 3.2.2 Append gesture session data to `gestures/{userId}/sessions/{sessionId}`
  - [x] 3.2.3 Provide mechanism to request deletion of collected gesture data (Requirement 24.2)
  - [x] 3.2.4 Gesture data summary view showing count and date range (Requirement 24.4)

- [x] 3.3 Build Live Captions Component
  - [x] 3.3.1 Integrate Web Speech API SpeechRecognition for real-time transcription
  - [x] 3.3.2 Integrate Google STT as higher-accuracy alternative
  - [x] 3.3.3 Display transcribed text in ARIA live region (`aria-live="polite"`)
  - [x] 3.3.4 Implement scroll-back history for caption review
  - [x] 3.3.5 Export captions as text file
  - [x] 3.3.6 Display error message with corrective suggestions on transcription failure (Requirement 3.4)

- [x] 3.4 Build Universal Translator Mode
  - [x] 3.4.1 Pipeline: Sign_Language_Recognizer → text display → Speech_Engine TTS
  - [x] 3.4.2 Display intermediate text simultaneously with audio output
  - [x] 3.4.3 Hearing participant speech input → STT → text display for deaf user
  - [x] 3.4.4 Per-stage error handling with text-only fallback (Requirement 16.4)

- [x] 3.5 Write Phase 3 tests
  - [x] 3.5.1 PBT — Property 3: Sign language recognition output completeness (fast-check, 100 iterations)
  - [x] 3.5.2 PBT — Property 4: Gesture data consent enforcement (fast-check, 100 iterations)
  - [x] 3.5.3 PBT — Property 16: Universal translator pipeline completeness (fast-check, 100 iterations)
  - [x] 3.5.4 Unit — Low-confidence gesture shows retry prompt
  - [x] 3.5.5 Unit — Live captions appear in ARIA live region
  - [x] 3.5.6 Unit — Pipeline stage failure triggers text-only fallback

---

## Phase 4: Chat + Multilingual Translation (Week 7–8)

- [x] 4.1 Implement Firebase Authentication
  - [x] 4.1.1 Email/password and Google OAuth sign-in
  - [x] 4.1.2 Auth state persistence and session management
  - [x] 4.1.3 Link auth user to Firestore `users/{userId}` profile

- [x] 4.2 Build Accessible Real-time Chat
  - [x] 4.2.1 Firestore real-time listener for `chats/{chatId}/messages`
  - [x] 4.2.2 Accessibility-first chat UI: large touch targets, high contrast, ARIA labels
  - [x] 4.2.3 New message announcements via ARIA live region
  - [x] 4.2.4 Voice input for composing messages (Web Speech API STT)
  - [x] 4.2.5 TTS playback for incoming messages (when preference enabled)
  - [x] 4.2.6 Offline message queuing to IndexedDB with sync on reconnect
  - [x] 4.2.7 Support pictogram-based message composition

- [x] 4.3 Implement Multilingual Translation
  - [x] 4.3.1 Integrate Google ML Kit for offline translation
  - [x] 4.3.2 Integrate Google Translate API for online translation
  - [x] 4.3.3 Language selector per chat conversation
  - [x] 4.3.4 Auto-translate incoming messages to user's preferred language
  - [x] 4.3.5 Store translated content in `messages/{messageId}/translatedContent`

- [x] 4.4 Write Phase 4 tests
  - [x] 4.4.1 Unit — Offline message queuing and sync on reconnect
  - [x] 4.4.2 Unit — TTS plays on incoming message when preference enabled
  - [x] 4.4.3 Unit — New message triggers ARIA live region announcement
  - [x] 4.4.4 Integration — Firestore real-time message delivery

---

## Phase 5: Screen Reader + Community (Week 9–10)

- [x] 5.1 WCAG 2.1 AA Accessibility Audit and Remediation
  - [x] 5.1.1 Run axe-core audit on all primary pages and fix all violations
  - [x] 5.1.2 Assign ARIA roles, labels, and descriptions to all interactive elements
  - [x] 5.1.3 Ensure logical tab order across all pages (no positive tabindex)
  - [x] 5.1.4 Verify all images and icons have descriptive alt text or aria-label
  - [x] 5.1.5 Wrap all dynamic content updates in ARIA live regions

- [x] 5.2 Implement Visual Alerts System
  - [x] 5.2.1 Flash indicator component triggered on any platform notification
  - [x] 5.2.2 Flash intensity configuration (subtle/moderate/strong)
  - [x] 5.2.3 Enforce ≤ 3 flashes/second (≥ 333ms interval) in animation logic (WCAG 2.3.1)

- [x] 5.3 Implement High Contrast and Font Size System
  - [x] 5.3.1 High contrast theme meeting ≥ 4.5:1 contrast ratio for normal text
  - [x] 5.3.2 Font size selector applying 14/18/24/32px to all body text immediately
  - [x] 5.3.3 Verify no page reload required for contrast/font changes

- [x] 5.4 Implement Voice Navigator
  - [x] 5.4.1 Voice command listener using Web Speech API
  - [x] 5.4.2 Command registry covering all primary navigation actions
  - [x] 5.4.3 Audio confirmation on each successfully executed command
  - [x] 5.4.4 Help overlay listing all available commands (triggered by "help" command)
  - [x] 5.4.5 Unrecognized command prompt: retry or say "help" (Requirement 9.3)

- [x] 5.5 Implement Braille Display Support
  - [x] 5.5.1 HID braille display detection and connection
  - [x] 5.5.2 Real-time text transmission to connected braille device
  - [x] 5.5.3 Visual + audio notification on device disconnect; continue without braille

- [x] 5.6 Build Community Forum
  - [x] 5.6.1 Post creation with text, image (alt text required), audio/video (captions required)
  - [x] 5.6.2 Reply and emoji reaction system
  - [x] 5.6.3 Flag system: hide post after 3 distinct user flags pending moderator review
  - [x] 5.6.4 Content moderation check before post submission
  - [x] 5.6.5 Full ARIA labeling and keyboard navigation for all forum controls
  - [x] 5.6.6 Topic boards and resource library sections

- [x] 5.7 Write Phase 5 tests
  - [x] 5.7.1 PBT — Property 11: Image alt text rendering (fast-check, 100 iterations)
  - [x] 5.7.2 PBT — Property 12: ARIA live region coverage (fast-check, 100 iterations)
  - [x] 5.7.3 PBT — Property 13: Visual flash rate compliance (fast-check, 100 iterations)
  - [x] 5.7.4 PBT — Property 14: High contrast mode contrast ratio (fast-check, 100 iterations)
  - [x] 5.7.5 PBT — Property 15: Font size setting application (fast-check, 100 iterations)
  - [x] 5.7.6 PBT — Property 22: Forum post moderation (fast-check, 100 iterations)
  - [x] 5.7.7 PBT — Property 23: Forum media accessibility requirement (fast-check, 100 iterations)
  - [x] 5.7.8 Unit — Voice navigator executes known commands with audio confirmation
  - [x] 5.7.9 Unit — Unknown voice command shows help prompt
  - [x] 5.7.10 Smoke — axe-core WCAG 2.1 AA audit passes on all primary pages

---

## Phase 6: Extra Features + Polish (Week 11–12)

- [x] 6.1 Build AI Conversation Assistant
  - [x] 6.1.1 Claude API integration for accessible conversational AI
  - [x] 6.1.2 Support text input, voice input (STT), and AAC_Board input modes
  - [x] 6.1.3 Screen reader and keyboard-only navigation compatibility
  - [x] 6.1.4 Graceful fallback message when Claude cannot fulfill request (Requirement 18.5)
  - [x] 6.1.5 Persistent entry point on all pages (floating button)

- [x] 6.2 Build Image-to-Speech Feature
  - [x] 6.2.1 Camera capture or image upload interface
  - [x] 6.2.2 Send image to Claude Vision API for description generation
  - [x] 6.2.3 Read description aloud via TTS Engine

- [x] 6.3 Build Smart Notification Interpreter
  - [x] 6.3.1 Ambient sound detection (doorbell, alarm, phone ring patterns)
  - [x] 6.3.2 Visual alert with label identifying detected sound type
  - [x] 6.3.3 FCM integration for push notification visual alerts

- [x] 6.4 Build SOS Service
  - [x] 6.4.1 Single-tap SOS button (floating, always visible)
  - [x] 6.4.2 Send FCM/email/SMS alert with GPS coordinates to all emergency contacts within 10s
  - [x] 6.4.3 Confirmation screen showing notified contacts and timestamp
  - [x] 6.4.4 Send alert without location when GPS unavailable; notify user (Requirement 19.5)
  - [x] 6.4.5 Disable SOS (show setup prompt) when zero emergency contacts configured

- [x] 6.5 Build Progress Tracker
  - [x] 6.5.1 Record completed sign language and speech therapy sessions (date, duration, accuracy)
  - [x] 6.5.2 Dashboard showing 7-day, 30-day, and all-time summaries
  - [x] 6.5.3 Milestone notification when accuracy ≥ configured threshold (default 80%)
  - [x] 6.5.4 CSV export of progress data

- [x] 6.6 Build Buddy System
  - [x] 6.6.1 Match request UI with disability type and language criteria
  - [x] 6.6.2 Matching service: find available volunteer matching user criteria
  - [x] 6.6.3 Notify both parties with each other's communication preferences on match
  - [x] 6.6.4 Post-session rating UI (1–5 stars)
  - [x] 6.6.5 No-volunteer timeout: offer queue or AI_Assistant after 5 minutes (Requirement 17.4)

- [x] 6.7 Build Caregiver/Companion Mode
  - [x] 6.7.1 Consent-gated caregiver access to user's communication history
  - [x] 6.7.2 Simplified caregiver view with large controls
  - [x] 6.7.3 Caregiver notification on SOS activation

- [x] 6.8 Build AAC Board Builder
  - [x] 6.8.1 Drag-and-drop pictogram layout editor
  - [x] 6.8.2 Custom pictogram upload with label and phrase
  - [x] 6.8.3 Save and share board configurations

- [x] 6.9 Build Sign Language Learning Mode
  - [x] 6.9.1 Guided fingerspelling exercises with MediaPipe feedback
  - [x] 6.9.2 Word-level sign recognition exercises
  - [x] 6.9.3 Progress tracking integration (accuracy scores per exercise)

- [x] 6.10 Implement Usage Analytics and Feedback
  - [x] 6.10.1 Consent prompt before any analytics collection
  - [x] 6.10.2 Anonymized event logging (no userId in analytics records)
  - [x] 6.10.3 Opt-out mechanism in user profile settings
  - [x] 6.10.4 Post-session feedback prompt (1–5 rating + optional comment)
  - [x] 6.10.5 Admin dashboard with aggregated ratings and usage stats

- [x] 6.11 Full Onboarding Redesign and Performance Optimization
  - [x] 6.11.1 Redesigned onboarding with animated transitions (Framer Motion)
  - [x] 6.11.2 Code splitting and lazy loading for all phase feature slices
  - [x] 6.11.3 Lighthouse performance audit: target ≥ 90 score
  - [x] 6.11.4 PWA install prompt and offline indicator in UI shell

- [x] 6.12 Write Phase 6 tests
  - [x] 6.12.1 PBT — Property 17: Buddy match criteria satisfaction (fast-check, 100 iterations)
  - [x] 6.12.2 PBT — Property 18: SOS button ubiquity and contact requirement (fast-check, 100 iterations)
  - [x] 6.12.3 PBT — Property 19: SOS confirmation completeness (fast-check, 100 iterations)
  - [x] 6.12.4 PBT — Property 20: Progress session recording and summary aggregation (fast-check, 100 iterations)
  - [x] 6.12.5 PBT — Property 21: Milestone notification threshold (fast-check, 100 iterations)
  - [x] 6.12.6 PBT — Property 24: Analytics consent enforcement (fast-check, 100 iterations)
  - [x] 6.12.7 PBT — Property 25: Feedback rating aggregation correctness (fast-check, 100 iterations)
  - [x] 6.12.8 PBT — Property 26: AI assistant persistent availability (fast-check, 100 iterations)
  - [x] 6.12.9 Unit — SOS sends alert without location when GPS unavailable
  - [x] 6.12.10 Unit — Progress milestone notification fires at threshold, not below
  - [x] 6.12.11 Unit — Analytics records contain no user-identifying fields
  - [x] 6.12.12 Integration — SOS FCM alert delivery to emergency contacts
  - [x] 6.12.13 Smoke — Firestore security rules restrict gesture dataset access
