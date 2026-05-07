# Requirements Document

## Introduction

UnifyTalk Medical is an accessibility-first communication platform for hospital patients who cannot speak or communicate easily due to disability, surgery, stroke, language barriers, or anxiety. The platform bridges the gap between patients and clinical staff using AI-powered symptom summarization, sign language recognition, pictogram boards, real-time chat, mental health check-ins, and emergency alerting — all built on a React 18 + Firebase stack with a warm, high-contrast, large-font UI.

## Glossary

- **Platform**: The UnifyTalk Medical web application as a whole
- **Patient**: A hospital patient using the Platform to communicate
- **Staff**: A doctor, nurse, or other clinical personnel receiving patient communications
- **SOS_Module**: The emergency alert subsystem
- **Symptom_Communicator**: The AI-assisted body-diagram symptom input subsystem
- **Sign_Language_Translator**: The MediaPipe-based ISL gesture recognition subsystem
- **Mental_Health_Module**: The mood check-in and distress detection subsystem
- **Records_Viewer**: The accessible medical records display subsystem
- **Doctor_Bridge**: The real-time two-way chat subsystem between Patient and Staff
- **Pictogram_Board**: The symbol-based message composition subsystem
- **AI_Summarizer**: The Claude API integration that converts structured inputs into natural-language medical sentences
- **TTS_Engine**: The Web Speech API (and optional custom voice) text-to-speech subsystem
- **Gesture_Classifier**: The trained ML model that maps MediaPipe hand landmarks to ISL signs
- **Mood_Analyzer**: The AI component that evaluates Patient mood check-in responses
- **Family_Connect**: The limited-access family view subsystem
- **Calm_Corner**: The distraction therapy and relaxation subsystem
- **Medication_Reminder**: The scheduled medication notification subsystem
- **Vitals_Dashboard**: The read-only patient vitals display subsystem
- **Language_Detector**: The component that identifies and applies the Patient's preferred language
- **Noise_Detector**: The ambient audio monitoring component
- **Eye_Gaze_Controller**: The MediaPipe Face Mesh-based blink/gaze navigation subsystem
- **Voice_Profile**: The custom TTS voice cloning subsystem for ALS/throat-cancer patients
- **Firebase**: The backend platform providing Auth, Firestore, Storage, and FCM
- **ISL**: Indian Sign Language

---

## Requirements

### Requirement 1: Emergency SOS Mode

**User Story:** As a Patient who cannot speak, I want to trigger an emergency alert with a single prominent button, so that nearby Staff are immediately notified of my critical need.

#### Acceptance Criteria

1. THE Platform SHALL display the SOS_Module button in a fixed, always-visible position on every screen at a minimum touch target size of 72×72 px.
2. WHEN a Patient presses and holds the SOS button for 2 seconds, THE SOS_Module SHALL dispatch an audible alarm and a push notification via Firebase FCM to all Staff assigned to the Patient's ward.
3. WHEN the SOS button is pressed for less than 2 seconds, THE SOS_Module SHALL display a visual countdown indicator and SHALL NOT dispatch an alert, preventing false alarms.
4. WHEN the SOS alert is triggered, THE SOS_Module SHALL present a selection of at least 5 pre-defined emergency messages including "I can't breathe," "I need pain relief," "I feel dizzy," "I need water," and "Call my family."
5. WHEN a Patient selects an emergency message, THE SOS_Module SHALL append that message text to the FCM notification payload delivered to Staff.
6. IF the FCM notification delivery fails, THEN THE SOS_Module SHALL retry delivery up to 3 times within 10 seconds and SHALL display a local on-screen alert to the Patient indicating the alert was sent.
7. WHEN an SOS alert is dispatched, THE SOS_Module SHALL log the timestamp, Patient identifier, ward, and selected message to Firestore for audit purposes.

---

### Requirement 2: AI Symptom Communicator

**User Story:** As a Patient who cannot verbally describe symptoms, I want to select body parts, pain types, and intensity on a visual diagram, so that the AI can generate a clear medical summary for my doctor.

#### Acceptance Criteria

1. THE Symptom_Communicator SHALL display an interactive human body diagram with selectable regions including at minimum: head, neck, chest, abdomen, left arm, right arm, left leg, right leg, and back.
2. WHEN a Patient selects one or more body regions, THE Symptom_Communicator SHALL present a pain-type selector with options: sharp, dull, burning, pressure, and throbbing.
3. WHEN a pain type is selected, THE Symptom_Communicator SHALL display an intensity scale from 1 to 10 with corresponding emoji faces representing pain levels.
4. WHEN a Patient submits the completed symptom form, THE AI_Summarizer SHALL generate a natural-language medical sentence in the format: "Patient reports [pain type] [body region] pain rated [intensity]/10[, additional context if provided]."
5. WHEN the AI_Summarizer produces a summary, THE Symptom_Communicator SHALL display the summary to the Patient for confirmation before transmitting it to Staff.
6. WHEN the Patient confirms the summary, THE Symptom_Communicator SHALL deliver the formatted summary to the assigned Staff via Firestore and SHALL optionally read it aloud via TTS_Engine.
7. IF the AI_Summarizer returns an error, THEN THE Symptom_Communicator SHALL display the raw structured inputs (body region, pain type, intensity) to Staff as a fallback.
8. THE Symptom_Communicator SHALL allow the Patient to add a free-text note of up to 200 characters to supplement the diagram inputs.
9. WHEN a symptom report is submitted, THE Symptom_Communicator SHALL record the timestamp, Patient identifier, and full structured input alongside the AI summary in Firestore.

---

### Requirement 3: Sign Language Medical Translator

**User Story:** As a Patient who communicates using Indian Sign Language, I want the app to recognize my hand gestures via camera, so that my signs are translated to text and speech for Staff.

#### Acceptance Criteria

1. WHEN the Sign_Language_Translator is activated, THE Platform SHALL request camera permission and, upon grant, begin a real-time MediaPipe Hands session tracking 21 hand landmark points per hand at a minimum of 15 frames per second.
2. WHEN hand landmarks are detected, THE Gesture_Classifier SHALL map the landmark coordinates to a recognized ISL sign from a vocabulary of at least 15 medical terms including: pain, water, toilet, medicine, doctor, nurse, help, food, cold, hot, yes, no, sleep, breathe, and family.
3. WHEN a sign is classified with a confidence score of 0.75 or above, THE Sign_Language_Translator SHALL display the recognized word as text on screen within 500 ms of the gesture being completed.
4. WHEN a recognized word is displayed, THE TTS_Engine SHALL speak the word aloud unless the Patient has muted audio output.
5. WHEN a sign is classified with a confidence score below 0.75, THE Sign_Language_Translator SHALL display a "Not recognized — please try again" prompt and SHALL NOT output incorrect text.
6. THE Sign_Language_Translator SHALL allow the Patient to build a multi-word phrase by sequencing recognized signs, and SHALL display the accumulated phrase until the Patient clears or sends it.
7. WHEN the Patient sends the accumulated phrase, THE Sign_Language_Translator SHALL deliver it as a text message to the assigned Staff via the Doctor_Bridge channel.
8. IF camera access is denied or unavailable, THEN THE Sign_Language_Translator SHALL display an instructional message and SHALL offer the Pictogram_Board as an alternative input method.

---

### Requirement 4: AI Mental Health Check-in

**User Story:** As a Patient experiencing emotional distress, I want to complete a daily mood check-in, so that Staff are alerted when I need psychological support.

#### Acceptance Criteria

1. THE Mental_Health_Module SHALL present a check-in prompt to the Patient once every 24 hours and SHALL allow the Patient to initiate an on-demand check-in at any time.
2. THE Mental_Health_Module SHALL offer at least 3 response modalities for each check-in question: emoji slider, mood card tap, and voice input via the TTS_Engine microphone.
3. WHEN a Patient completes a check-in, THE Mood_Analyzer SHALL evaluate the responses and classify the Patient's emotional state into one of: calm, mild distress, moderate distress, or severe distress.
4. WHEN the Mood_Analyzer classifies a Patient as moderately or severely distressed, THE Mental_Health_Module SHALL send a Staff notification via FCM within 60 seconds, including the Patient's room number and a summary such as "Patient in Room [room] has reported feeling very anxious for [N] consecutive days."
5. WHEN the Mood_Analyzer classifies a Patient as moderately or severely distressed, THE Mental_Health_Module SHALL immediately offer the Patient access to guided breathing exercises and calming audio from the Calm_Corner.
6. THE Mental_Health_Module SHALL retain check-in history in Firestore for a minimum of 30 days per Patient to enable trend analysis by Staff.
7. IF the Mood_Analyzer API call fails, THEN THE Mental_Health_Module SHALL store the raw check-in responses locally and retry the analysis within 5 minutes.
8. WHEN a Patient completes a check-in, THE Mental_Health_Module SHALL display a brief affirming acknowledgment message before dismissing the check-in screen.

---

### Requirement 5: Accessible Medical Records Viewer

**User Story:** As a Patient with limited medical literacy or visual impairment, I want to view my medical records in plain language with accessibility options, so that I can understand my health status without assistance.

#### Acceptance Criteria

1. THE Records_Viewer SHALL connect to hospital records via a configurable REST API endpoint or accept manual PDF/document upload via Firebase Storage.
2. WHEN a medical record is loaded, THE AI_Summarizer SHALL generate a plain-language summary replacing medical jargon, and THE Records_Viewer SHALL display both the plain-language summary and an option to view the original document.
3. THE Records_Viewer SHALL provide a text-to-speech button that, when activated, causes THE TTS_Engine to read the plain-language summary aloud.
4. THE Records_Viewer SHALL provide a high-contrast mode toggle that switches the display to a minimum contrast ratio of 7:1 (WCAG AAA) and a large-font mode toggle that increases base font size to a minimum of 20 px.
5. THE Records_Viewer SHALL allow the Patient to filter records by date range, test type, and ordering doctor.
6. WHEN a record is displayed, THE Records_Viewer SHALL show the record date, ordering doctor's name, and test type in a prominent header above the plain-language summary.
7. IF the hospital API returns an error or is unavailable, THEN THE Records_Viewer SHALL display the last successfully cached records and SHALL indicate the data freshness timestamp.

---

### Requirement 6: Doctor Bridge Chat

**User Story:** As a Patient who cannot speak, I want a real-time two-way chat with my doctor or nurse, so that I can communicate needs and receive responses without verbal speech.

#### Acceptance Criteria

1. THE Doctor_Bridge SHALL provide a real-time chat interface backed by Firestore, with message delivery latency under 2 seconds under normal network conditions.
2. THE Patient side of Doctor_Bridge SHALL accept input via at minimum four modalities: typed text, voice-to-text via Google Speech-to-Text, pictogram selection from the Pictogram_Board, and sign language input from the Sign_Language_Translator.
3. WHEN a Patient sends a message via pictogram or sign language input, THE AI_Summarizer SHALL convert the input to a readable English sentence before delivering it to the Staff view.
4. WHEN a Staff member sends a text reply, THE TTS_Engine SHALL read the reply aloud to the Patient unless audio output is muted.
5. THE Staff side of Doctor_Bridge SHALL provide a set of at least 10 quick-reply templates including: "I'll be there shortly," "Please press the call button," "Your medication is on the way," "The doctor has been notified," and "Try to rest."
6. THE Doctor_Bridge SHALL display a read receipt indicator showing when the Staff member has viewed the Patient's message.
7. WHEN a Patient is connected to Doctor_Bridge, THE Platform SHALL display the assigned Staff member's name and role in the chat header.
8. IF the Firestore connection is interrupted, THEN THE Doctor_Bridge SHALL queue outgoing messages locally and deliver them automatically when connectivity is restored, notifying the Patient of the offline state.

---

### Requirement 7: Multilingual Support

**User Story:** As a Patient whose primary language is not English, I want the app to detect and display content in my preferred language, so that I can use all features without a language barrier.

#### Acceptance Criteria

1. WHEN a Patient first opens the Platform, THE Language_Detector SHALL identify the device's locale setting and set the active language accordingly.
2. THE Platform SHALL support at minimum the following languages: English, Kannada, Hindi, Tamil, Telugu, and Bengali.
3. WHEN the active language is set, THE Platform SHALL translate all UI labels, prompts, quick phrases, and AI-generated summaries into the active language using Google Translate API or on-device ML Kit translation.
4. THE Platform SHALL allow the Patient to manually override the detected language from a language selector accessible from the main settings screen.
5. WHEN the language is changed, THE Platform SHALL apply the new language to all visible UI elements within 1 second without requiring a full page reload.
6. WHERE on-device ML Kit translation is available, THE Platform SHALL prefer on-device translation to minimize latency and avoid sending Patient data to external servers.

---

### Requirement 8: Ambient Noise Detection

**User Story:** As a Patient in a noisy ICU environment, I want the app to detect when background noise makes voice input unreliable, so that it automatically switches to a touch-based input mode.

#### Acceptance Criteria

1. WHILE voice input is active, THE Noise_Detector SHALL continuously sample ambient audio and compute a noise level in decibels at intervals of 500 ms or less.
2. WHEN the measured ambient noise level exceeds 65 dB for 3 consecutive samples, THE Noise_Detector SHALL automatically switch the active input mode to touch/pictogram and SHALL display a visual indicator showing "Noisy environment — touch mode active."
3. WHEN the ambient noise level drops below 55 dB for 5 consecutive samples, THE Noise_Detector SHALL offer the Patient the option to re-enable voice input via a non-intrusive prompt.
4. THE Platform SHALL display a persistent microphone quality indicator icon that reflects the current noise level: green (below 55 dB), yellow (55–65 dB), or red (above 65 dB).
5. IF microphone access is denied, THEN THE Noise_Detector SHALL default to touch/pictogram mode and SHALL hide the microphone quality indicator.

---

### Requirement 9: Medication Reminder System

**User Story:** As a Patient managing multiple medications, I want scheduled reminders with easy confirmation, so that I take medications on time and my doctor can track compliance.

#### Acceptance Criteria

1. THE Medication_Reminder SHALL display a full-screen reminder notification at the scheduled medication time, including the medication name, dosage, and instructions.
2. WHEN a reminder is displayed, THE TTS_Engine SHALL read the reminder aloud unless audio output is muted.
3. WHEN a Patient taps "Taken," THE Medication_Reminder SHALL record the confirmation with a timestamp in Firestore and dismiss the reminder.
4. WHEN a Patient taps "Need Nurse," THE Medication_Reminder SHALL send a push notification to the assigned Staff via FCM and SHALL display a confirmation to the Patient that help has been requested.
5. IF a Patient does not respond to a reminder within 15 minutes, THEN THE Medication_Reminder SHALL re-display the reminder once and SHALL log a missed-dose event in Firestore.
6. THE Staff dashboard SHALL display a medication compliance log per Patient showing confirmed doses, missed doses, and nurse-assist requests, filterable by date.

---

### Requirement 10: Eye-Gaze and Blink Control

**User Story:** As a completely paralyzed Patient, I want to navigate the app using eye movement and blinking, so that I can communicate without any physical touch.

#### Acceptance Criteria

1. WHEN Eye_Gaze_Controller is enabled, THE Platform SHALL activate a MediaPipe Face Mesh session tracking facial landmarks at a minimum of 15 frames per second using the front-facing camera.
2. THE Eye_Gaze_Controller SHALL interpret a deliberate double-blink (two blinks within 600 ms) as a "select" or "yes" action on the currently focused UI element.
3. THE Eye_Gaze_Controller SHALL interpret sustained gaze to the left for 1 second as a "navigate back" action and sustained gaze to the right for 1 second as a "navigate forward" action.
4. THE Eye_Gaze_Controller SHALL highlight the currently focused UI element with a visible focus ring of at least 3 px width to provide visual feedback to caregivers observing the screen.
5. WHEN Eye_Gaze_Controller is active, THE Platform SHALL display a calibration prompt on first use and SHALL allow recalibration from the settings screen at any time.
6. IF the front-facing camera is unavailable or Face Mesh initialization fails, THEN THE Eye_Gaze_Controller SHALL display an error message and SHALL fall back to touch input mode.

---

### Requirement 11: Voice Profile and Cloning for ALS Patients

**User Story:** As a Patient who is progressively losing their voice due to ALS or throat cancer, I want to record my voice now so the app can use it for speech synthesis later, so that my messages sound like me.

#### Acceptance Criteria

1. THE Voice_Profile module SHALL allow a Patient to record a minimum of 10 voice samples of at least 5 seconds each via the device microphone, stored in Firebase Storage.
2. WHEN sufficient voice samples are recorded, THE Voice_Profile module SHALL process the recordings to generate a personalized TTS voice model associated with the Patient's account.
3. WHEN a personalized voice model exists for a Patient, THE TTS_Engine SHALL use that model for all speech output instead of the default system voice.
4. THE Voice_Profile module SHALL display a recording quality indicator during capture and SHALL reject samples with ambient noise above 50 dB or duration below 5 seconds.
5. THE Patient SHALL be able to preview the generated voice model by typing a test phrase and triggering playback before confirming the profile.
6. IF voice model generation fails, THEN THE Voice_Profile module SHALL notify the Patient and SHALL retain the raw recordings for a retry attempt.

---

### Requirement 12: Patient Vitals Dashboard

**User Story:** As a Patient connected to hospital monitoring systems, I want to see my vitals in a simple, color-coded display, so that I feel informed and reassured about my health status.

#### Acceptance Criteria

1. THE Vitals_Dashboard SHALL display at minimum the following vitals when available from the hospital system API: heart rate (bpm), blood oxygen saturation (SpO₂ %), and body temperature (°C).
2. THE Vitals_Dashboard SHALL color-code each vital using the following scheme: green for values within the normal range, yellow for values outside normal range by up to 10%, and red for values outside normal range by more than 10%.
3. WHEN a vital is displayed in the green range, THE Vitals_Dashboard SHALL show a reassuring plain-language label such as "Your oxygen is [value]% — that's great."
4. THE Vitals_Dashboard SHALL refresh vital data at intervals of 30 seconds or less when connected to the hospital API.
5. THE Vitals_Dashboard SHALL operate in read-only mode; THE Platform SHALL provide no controls that could affect hospital monitoring equipment.
6. IF the hospital API connection is lost, THEN THE Vitals_Dashboard SHALL display the last known values with a "Last updated [timestamp]" label and a visual stale-data indicator.

---

### Requirement 13: Pictogram Communication Board

**User Story:** As a Patient who cannot type or speak, I want to tap pre-loaded symbols to compose messages, so that I can communicate basic needs quickly.

#### Acceptance Criteria

1. THE Pictogram_Board SHALL provide a minimum of 76 pre-loaded symbols organized into at least 5 categories: Needs, Pain, Emotions, Food, and People.
2. WHEN a Patient taps a symbol, THE Pictogram_Board SHALL add it to a message composition area displayed at the top of the screen.
3. THE Pictogram_Board SHALL allow the Patient to reorder or remove individual symbols from the composition area before sending.
4. WHEN the Patient sends the composed pictogram sequence, THE AI_Summarizer SHALL convert the symbol sequence into a natural-language sentence and THE TTS_Engine SHALL speak it aloud.
5. WHEN the pictogram message is sent, THE Pictogram_Board SHALL deliver the natural-language sentence to the assigned Staff via the Doctor_Bridge channel.
6. THE Pictogram_Board SHALL display each symbol with both an icon and a text label beneath it, with a minimum icon size of 64×64 px, to support patients with varying visual acuity.
7. THE Pictogram_Board SHALL support a search function allowing the Patient to find symbols by keyword.

---

### Requirement 14: Family Connect Mode

**User Story:** As a family member of a hospitalized Patient, I want secure limited access to the Patient's app, so that I can stay informed and send supportive messages.

#### Acceptance Criteria

1. THE Family_Connect module SHALL allow a Patient or authorized Staff member to generate a time-limited secure access link valid for up to 72 hours, shareable with family members.
2. WHEN a family member accesses the Platform via the secure link, THE Family_Connect module SHALL display a read-only view of the Patient's mood check-in history, medication reminder compliance, and Doctor_Bridge chat (subject to Patient consent settings).
3. THE Family_Connect module SHALL allow family members to send short text messages of up to 160 characters to the Patient.
4. WHEN a family message is received, THE Platform SHALL display it to the Patient with a distinct visual style and SHALL optionally read it aloud via TTS_Engine.
5. THE Family_Connect module SHALL enforce that family members cannot access raw medical records, vitals data, or clinical notes.
6. WHEN the access link expires or is revoked by the Patient, THE Family_Connect module SHALL immediately terminate the family member's session and SHALL prevent further access.
7. THE Family_Connect module SHALL log all family access events (link generation, login, messages sent) in Firestore for audit purposes.

---

### Requirement 15: Calm Corner and Distraction Therapy

**User Story:** As a Patient experiencing anxiety or discomfort, I want access to calming audio and breathing exercises, so that I can self-manage stress during my hospital stay.

#### Acceptance Criteria

1. THE Calm_Corner SHALL be accessible from the main navigation menu at all times, including during active SOS or chat sessions.
2. THE Calm_Corner SHALL provide at minimum 3 soothing audio tracks (e.g., rain, nature sounds, gentle music) that the Patient can play, pause, and adjust volume for independently.
3. THE Calm_Corner SHALL provide at minimum 2 guided breathing exercise animations with visual inhale/exhale cues and configurable cycle durations of 4, 6, or 8 seconds.
4. WHEN a breathing exercise is active, THE TTS_Engine SHALL optionally narrate the inhale/exhale cues if the Patient has enabled audio guidance.
5. THE Calm_Corner SHALL allow the Patient to set a sleep timer of 15, 30, or 60 minutes after which audio playback stops automatically.
6. WHILE Calm_Corner audio is playing, THE Platform SHALL continue to display the SOS_Module button and SHALL not suppress SOS alerts or incoming Staff messages.
