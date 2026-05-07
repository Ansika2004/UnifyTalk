# Requirements Document

## Introduction

UnifyTalk Accessibility is a universal communication platform for people with disabilities in everyday life — not a clinical or hospital setting. It serves three primary user groups: Deaf/Hard of Hearing users who cannot hear spoken communication, Mute/Non-verbal users who cannot produce speech, and Blind/Low Vision users who cannot see the screen.

The platform provides an accessible chat interface, a pictogram communication board, AI-powered sign language translation (ISL + ASL), real-time speech-to-text live captions, a text-to-speech engine, multilingual real-time translation, screen reader and Braille bridge support, and a community platform. Additional features include an AI conversation assistant, image-to-speech, accessible video calling, AAC board builder, sign language learning mode, smart notification interpretation, eye gaze navigation, and caregiver/companion mode.

UnifyTalk Accessibility shares the same design language and component library as the UnifyTalk Medical app and is intended to eventually merge under a single UnifyTalk umbrella with a Medical Mode and Accessibility Mode toggle.

Tech stack: React 18 + Tailwind CSS + Framer Motion, React Router DOM 6, Firebase (Auth, Firestore, Storage, FCM), MediaPipe Hands, Claude API, Web Speech API, Google STT, Google ML Kit + Translate API, ElevenLabs, WebRTC, PWA/Service Workers, Vercel hosting.

---

## Glossary

- **Platform**: The UnifyTalk Accessibility web application
- **Chat_Interface**: The accessible messaging UI supporting text, voice, pictogram, and sign language input/output
- **Pictogram_Board**: The symbol-based communication board containing 100+ pictograms organized into 9 categories
- **Pictogram_Composer**: The component that assembles selected pictograms into a natural-language sentence via the Claude API
- **Sign_Language_Translator**: The MediaPipe Hands-based component that recognizes ISL and ASL gestures from camera input and produces text output
- **Caption_Engine**: The real-time speech-to-text component that transcribes microphone audio and displays live captions with speaker identification
- **TTS_Engine**: The text-to-speech component (Web Speech API + ElevenLabs) that converts typed or composed text to audio output
- **Quick_Speak_Panel**: The pre-loaded panel of 20 frequently used phrases available for one-tap TTS output
- **Translation_Service**: The multilingual translation component supporting 50+ languages via Google Translate API and offline ML Kit for 10 languages
- **Screen_Reader_Bridge**: The ARIA-compliant component that ensures full compatibility with external screen readers and Braille display devices
- **Community_Platform**: The moderated social space including posts, topic boards, direct messaging, and a resource library
- **AI_Assistant**: The Claude API-powered conversational assistant accessible from any page
- **Image_Reader**: The camera-based component that reads text and identifies objects aloud using OCR and object detection
- **Video_Call**: The WebRTC-based accessible video calling component with integrated live captions
- **AAC_Builder**: The drag-and-drop tool for creating and customizing personal communication boards
- **Sign_Learning_Mode**: The guided sign language learning component with animated demonstrations and practice feedback
- **Notification_Interpreter**: The sound detection component that converts ambient audio events into visual and haptic alerts
- **Eye_Gaze_Controller**: The MediaPipe Face Mesh-based component that enables hands-free navigation via eye gaze
- **Companion_Mode**: The caregiver/companion interface that provides a simplified view of the user's communication activity
- **User_Profile**: The stored record of a user's disability type, preferred communication modes, language, and accessibility preferences
- **Onboarding_Flow**: The initial setup wizard that configures the Platform to the user's needs
- **Offline_Cache**: The service worker cache that stores pictogram data and ML Kit models for offline use

---

## Requirements

### Requirement 1: Accessible UI Foundation and Onboarding

**User Story:** As a new user with a disability, I want to complete an onboarding flow that configures the Platform to my specific needs, so that I can start communicating immediately without manual setup.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL present the user with a disability type selection (Deaf/Hard of Hearing, Mute/Non-verbal, Blind/Low Vision, or any combination) before any other configuration step.
2. WHEN a user completes the Onboarding_Flow, THE Platform SHALL apply a default accessibility profile matching the selected disability type(s), including contrast mode, font size, input method, and output method.
3. WHEN a user logs in after completing onboarding, THE Platform SHALL restore the saved User_Profile settings within 1 second without requiring manual reconfiguration.
4. IF a User_Profile cannot be loaded from Firebase, THEN THE Platform SHALL apply a high-contrast, large-font default configuration and display a notification informing the user that default settings are active.
5. THE Platform SHALL allow a user to update disability type and accessibility preferences at any time from the settings page, with changes persisted to the User_Profile within 2 seconds.
6. THE Onboarding_Flow SHALL be fully navigable via keyboard, screen reader, and voice input to ensure no user is excluded from completing setup.

---

### Requirement 2: Accessible Chat Interface

**User Story:** As a user with a disability, I want a chat interface that supports my preferred input and output methods, so that I can communicate with others in the way that works best for me.

#### Acceptance Criteria

1. THE Chat_Interface SHALL support text input, voice input via the Caption_Engine, pictogram input via the Pictogram_Board, and sign language input via the Sign_Language_Translator as selectable input modes.
2. THE Chat_Interface SHALL support text output, TTS audio output via the TTS_Engine, and visual output with configurable font size and contrast as selectable output modes.
3. WHEN a message is received, THE Chat_Interface SHALL announce the new message via an ARIA live region so screen readers notify the user without requiring focus change.
4. THE Chat_Interface SHALL render with a minimum contrast ratio of 4.5:1 for all text elements in accordance with WCAG 2.1 Level AA.
5. THE Chat_Interface SHALL support font sizes of at least 14px, 18px, 24px, and 32px, selectable from the User_Profile settings.
6. THE Chat_Interface SHALL provide haptic feedback on message send and receive events on devices that support the Vibration API.
7. IF a message fails to send due to a network error, THEN THE Chat_Interface SHALL retain the unsent message in the input field and display a descriptive error with a retry option.

---

### Requirement 3: Pictogram Communication Board

**User Story:** As a Mute/Non-verbal user, I want to tap pictograms to compose messages, so that I can communicate without typing or speaking.

#### Acceptance Criteria

1. THE Pictogram_Board SHALL display a minimum of 100 pictograms organized into 9 categories (e.g., emotions, needs, food, people, places, actions, objects, social, emergency).
2. WHEN a user taps a pictogram, THE Pictogram_Board SHALL add the pictogram to the active composition area and display the associated label text immediately.
3. WHEN a user activates the "Compose" action on a sequence of selected pictograms, THE Pictogram_Composer SHALL send the pictogram sequence to the Claude API and return a natural-language sentence within 3 seconds.
4. WHEN the Pictogram_Composer returns a natural-language sentence, THE Platform SHALL display the sentence and optionally trigger TTS output based on the user's preference.
5. THE Pictogram_Board SHALL function fully offline using the Offline_Cache, with all pictogram images and labels available without a network connection.
6. WHEN the device is offline, THE Pictogram_Composer SHALL fall back to a template-based sentence construction method and SHALL NOT require a Claude API call.
7. THE Pictogram_Board SHALL be fully navigable via keyboard and compatible with external screen readers via ARIA labels on every pictogram.
8. THE Platform SHALL allow a user to add custom pictograms by uploading an image and providing a label, with the custom pictogram persisted to the User_Profile.

---

### Requirement 4: Sign Language AI Translator (ISL + ASL)

**User Story:** As a Deaf or Hard of Hearing user, I want the Platform to recognize my sign language gestures in real time and convert them to text, so that I can communicate with people who do not know sign language.

#### Acceptance Criteria

1. WHEN a user activates sign language input mode and grants camera permission, THE Sign_Language_Translator SHALL begin processing the camera feed using MediaPipe Hands and display recognized text within 500ms of each completed gesture.
2. THE Sign_Language_Translator SHALL support both ISL (Indian Sign Language) and ASL (American Sign Language) as selectable input languages.
3. THE Sign_Language_Translator SHALL support both fingerspelling mode (letter-by-letter) and word mode (whole-word gesture recognition) as selectable recognition modes.
4. WHEN the Sign_Language_Translator produces a text output, THE Platform SHALL display the recognized text in a clearly visible text area with a confidence indicator.
5. IF the Sign_Language_Translator cannot detect a gesture with sufficient confidence (below 70%), THEN THE Platform SHALL display a prompt asking the user to repeat the gesture rather than displaying an incorrect result.
6. WHERE the user requests a "show me" demonstration, THE Sign_Language_Translator SHALL display an animated illustration of the sign for a given word or phrase.
7. WHEN sign language output text is produced, THE Platform SHALL optionally pass the text to the TTS_Engine for audio output based on the user's preference.

---

### Requirement 5: Real-Time Speech to Text (Live Captions)

**User Story:** As a Deaf or Hard of Hearing user, I want spoken words to appear as live captions on my screen, so that I can follow conversations without relying on lip reading.

#### Acceptance Criteria

1. WHEN a user activates live captions mode, THE Caption_Engine SHALL begin transcribing microphone audio and display the transcribed text on screen within 300ms of each spoken phrase.
2. THE Caption_Engine SHALL identify and label different speakers when multiple speakers are detected, displaying each speaker's text in a distinct visual style.
3. THE Caption_Engine SHALL maintain a scrollable caption history for the duration of the session, allowing the user to scroll back to review earlier captions.
4. WHEN a user activates the export action, THE Caption_Engine SHALL export the full caption history as a plain text (.txt) file within 2 seconds.
5. THE Caption_Engine SHALL support transcription in all languages supported by the Google STT API for the user's selected language.
6. IF the Caption_Engine cannot transcribe audio due to microphone unavailability or an unsupported language, THEN THE Platform SHALL display a descriptive error message and suggest corrective actions.

---

### Requirement 6: Text to Speech Engine

**User Story:** As a Mute/Non-verbal user, I want typed text to be spoken aloud in a natural voice, so that I can communicate verbally with hearing people.

#### Acceptance Criteria

1. WHEN a user types text and activates the speak action, THE TTS_Engine SHALL convert the text to audio output within 500ms using a natural-sounding voice via ElevenLabs or the Web Speech API.
2. THE TTS_Engine SHALL allow the user to select voice gender, language, and speech rate from the available options.
3. THE TTS_Engine SHALL provide a volume boost option that increases output volume by up to 200% of the device's current volume level.
4. THE Quick_Speak_Panel SHALL display 20 pre-loaded frequently used phrases that the user can activate with a single tap to trigger immediate TTS output.
5. THE Platform SHALL allow a user to record a custom voice profile via the Voice_Profile_Recorder and use it as the TTS_Engine output voice.
6. WHEN a user adjusts speech rate or voice settings, THE TTS_Engine SHALL apply the updated settings to all subsequent TTS conversions in the same session.
7. IF the TTS_Engine fails to produce audio output, THEN THE Platform SHALL display a descriptive error message and retain the typed text so the user does not lose their input.

---

### Requirement 7: Multilingual Real-Time Translation

**User Story:** As a user communicating across language barriers, I want messages to be automatically translated into my preferred language, so that I can communicate with people who speak different languages.

#### Acceptance Criteria

1. THE Translation_Service SHALL automatically detect the source language of incoming messages and translate them to the user's preferred language without requiring manual language selection.
2. THE Translation_Service SHALL support translation between a minimum of 50 languages via the Google Translate API when the device is online.
3. THE Translation_Service SHALL support offline translation for a minimum of 10 languages using the Google ML Kit on-device translation model.
4. WHEN the device transitions from online to offline, THE Translation_Service SHALL automatically switch to the offline ML Kit model for supported languages and notify the user of the switch.
5. WHEN the device transitions from offline to online, THE Translation_Service SHALL automatically switch back to the Google Translate API and notify the user.
6. IF the source language cannot be detected with sufficient confidence, THEN THE Translation_Service SHALL display a language selector prompt and allow the user to specify the source language manually.

---

### Requirement 8: Screen Reader and Braille Bridge

**User Story:** As a Blind/Low Vision user, I want every element on the Platform to be labeled for screen readers and compatible with my Braille display, so that I can use the Platform independently.

#### Acceptance Criteria

1. THE Screen_Reader_Bridge SHALL assign ARIA roles, labels, and descriptions to every interactive and informational element on the Platform in accordance with WCAG 2.1 Level AA guidelines.
2. THE Platform SHALL ensure all images, icons, and non-text content have descriptive alt text or ARIA labels.
3. WHEN dynamic content updates on screen (e.g., new messages, alerts, translation results), THE Screen_Reader_Bridge SHALL use ARIA live regions to announce the update without requiring user focus change.
4. THE Platform SHALL maintain a logical tab order across all pages so that keyboard and screen reader navigation follows a predictable, top-to-bottom sequence.
5. WHEN a Braille display device is connected and detected via OS APIs, THE Screen_Reader_Bridge SHALL transmit all focused text content to the Braille display in real time.
6. IF a Braille display device disconnects during a session, THEN THE Platform SHALL display a visual and audio notification and continue operating without Braille output until the device reconnects.
7. THE Platform SHALL support swipe gesture navigation for screen reader users on touch devices, following standard iOS VoiceOver and Android TalkBack gesture conventions.

---

### Requirement 9: Community Platform

**User Story:** As a user with a disability, I want a safe community space to connect with others, share experiences, and access resources, so that I feel supported and less isolated.

#### Acceptance Criteria

1. THE Community_Platform SHALL allow users to create posts, reply to posts, and react to posts using emoji reactions on topic boards.
2. THE Community_Platform SHALL support direct messaging between users.
3. THE Community_Platform SHALL provide a resource library containing curated articles, guides, and tools relevant to users with disabilities.
4. WHEN a post is flagged by 3 or more users, THE Community_Platform SHALL hide the post pending moderator review and notify the original poster.
5. THE Community_Platform SHALL ensure all posts, controls, and navigation elements have ARIA labels and are navigable via keyboard and screen reader.
6. WHEN a user creates a post, THE Platform SHALL allow the user to attach images (with required alt text) and audio/video content (with required captions).
7. IF a user attempts to post content that violates community guidelines as detected by content moderation, THEN THE Platform SHALL block the post and display a descriptive explanation of the violation.

---

### Requirement 10: AI Conversation Assistant

**User Story:** As a user with a disability, I want access to an AI assistant that understands my communication needs, so that I can get help navigating the Platform and composing messages.

#### Acceptance Criteria

1. THE AI_Assistant SHALL be accessible from any page on the Platform via a persistent, clearly labeled entry point.
2. WHEN a user sends a message to the AI_Assistant, THE AI_Assistant SHALL respond within 3 seconds using the Claude API.
3. THE AI_Assistant SHALL accept text input, voice input via the Caption_Engine, and pictogram input via the Pictogram_Board as interaction modes.
4. THE AI_Assistant SHALL be fully compatible with screen readers and keyboard-only navigation.
5. IF the AI_Assistant cannot fulfill a user's request, THEN THE AI_Assistant SHALL acknowledge the limitation and suggest an alternative Platform feature or resource.

---

### Requirement 11: Image to Speech

**User Story:** As a Blind/Low Vision user, I want to point my camera at text or objects and have them read aloud, so that I can understand my physical environment without sighted assistance.

#### Acceptance Criteria

1. WHEN a user activates the Image_Reader and points the camera at printed text, THE Image_Reader SHALL perform OCR and read the detected text aloud via the TTS_Engine within 3 seconds of capture.
2. WHEN a user activates the Image_Reader and points the camera at objects, THE Image_Reader SHALL identify the primary objects in the scene and read a descriptive label aloud via the TTS_Engine within 3 seconds of capture.
3. THE Image_Reader SHALL allow the user to capture a still image or use a continuous live camera feed as the input source.
4. IF the Image_Reader cannot detect readable text or identifiable objects in the captured image, THEN THE Platform SHALL inform the user via TTS output that no content was detected and prompt the user to try again.

---

### Requirement 12: Accessible Video Calling

**User Story:** As a user with a disability, I want to make video calls with live captions and sign language support, so that I can communicate face-to-face with others regardless of hearing or speech ability.

#### Acceptance Criteria

1. THE Video_Call component SHALL establish a peer-to-peer video call using WebRTC within 5 seconds of both parties accepting the call.
2. WHEN a Video_Call is active, THE Caption_Engine SHALL display live captions of all speech in the call in real time.
3. WHEN a Video_Call is active, THE Sign_Language_Translator SHALL remain available as an input mode so Deaf users can sign during the call.
4. THE Video_Call component SHALL support a minimum video resolution of 480p to ensure sign language gestures are visible.
5. IF a Video_Call connection drops unexpectedly, THEN THE Platform SHALL attempt to reconnect automatically within 10 seconds and notify both parties of the reconnection attempt.

---

### Requirement 13: AAC Board Builder

**User Story:** As a Mute/Non-verbal user or caregiver, I want to build a custom communication board tailored to my specific vocabulary, so that I can communicate the things most relevant to my daily life.

#### Acceptance Criteria

1. THE AAC_Builder SHALL allow a user to create a custom communication board by selecting pictograms from the existing library, uploading custom images, and assigning text labels.
2. THE AAC_Builder SHALL support drag-and-drop reordering of pictograms within a board.
3. WHEN a user saves a custom board, THE Platform SHALL persist the board configuration to the User_Profile in Firebase within 2 seconds.
4. THE Platform SHALL allow a user to create, rename, duplicate, and delete multiple custom boards.
5. THE AAC_Builder SHALL be fully navigable via keyboard for users who cannot use a mouse or touch screen.

---

### Requirement 14: Sign Language Learning Mode

**User Story:** As a user who wants to learn sign language, I want guided lessons with animated demonstrations and practice feedback, so that I can improve my signing skills over time.

#### Acceptance Criteria

1. THE Sign_Learning_Mode SHALL provide structured lessons covering the ISL and ASL alphabets and a core vocabulary of at least 100 common words.
2. WHEN a user completes a lesson exercise, THE Sign_Learning_Mode SHALL use the Sign_Language_Translator to evaluate the user's gesture and provide pass/fail feedback within 1 second.
3. THE Sign_Learning_Mode SHALL display an animated illustration of the correct sign for each word or phrase being practiced.
4. THE Platform SHALL record the user's lesson completion history and accuracy scores in the User_Profile.
5. WHEN a user achieves an accuracy score of 80% or above on a lesson, THE Platform SHALL display a milestone achievement notification.

---

### Requirement 15: Smart Notification Interpreter

**User Story:** As a Deaf or Hard of Hearing user, I want the Platform to detect ambient sounds and alert me visually and through haptic feedback, so that I am aware of important audio events in my environment.

#### Acceptance Criteria

1. WHEN the Notification_Interpreter is active, THE Platform SHALL continuously monitor the device microphone for predefined sound events (e.g., doorbell, alarm, phone ring, baby cry, smoke detector).
2. WHEN a predefined sound event is detected, THE Notification_Interpreter SHALL display a visual alert identifying the sound type and trigger haptic feedback on devices that support the Vibration API within 500ms of detection.
3. THE Platform SHALL allow users to configure which sound event types trigger alerts and to add custom sound patterns.
4. WHEN the Notification_Interpreter is active, THE Platform SHALL display a persistent indicator showing that sound monitoring is running.
5. IF the Notification_Interpreter cannot access the device microphone, THEN THE Platform SHALL display a descriptive error and guide the user to grant microphone permission.

---

### Requirement 16: Eye Gaze Navigation

**User Story:** As a user with limited motor ability, I want to navigate the Platform using eye gaze, so that I can use all features without physical touch or keyboard input.

#### Acceptance Criteria

1. WHEN a user activates Eye_Gaze_Controller mode, THE Platform SHALL use MediaPipe Face Mesh to track the user's eye gaze and map it to on-screen navigation targets.
2. THE Eye_Gaze_Controller SHALL support dwell-click activation, where a user triggers a UI element by holding their gaze on it for a configurable dwell time (default 1.5 seconds, range 0.5–3 seconds).
3. WHEN the Eye_Gaze_Controller is active, THE Platform SHALL display a visible gaze cursor indicating the current gaze position on screen.
4. THE Eye_Gaze_Controller SHALL provide a calibration routine that the user can run at any time to improve tracking accuracy.
5. IF the Eye_Gaze_Controller loses face tracking for more than 3 seconds, THEN THE Platform SHALL pause gaze navigation and display a prompt asking the user to re-center their face in the camera frame.

---

### Requirement 17: Caregiver / Companion Mode

**User Story:** As a caregiver or companion of a user with a disability, I want a simplified view of the user's communication activity, so that I can assist them effectively without accessing their full account.

#### Acceptance Criteria

1. THE Companion_Mode SHALL provide a separate, simplified interface showing the user's recent pictogram compositions, TTS outputs, and incoming messages.
2. WHEN a user grants companion access to a caregiver, THE Platform SHALL send the caregiver an invitation link that grants read-only access to the Companion_Mode view.
3. THE Companion_Mode SHALL allow a caregiver to send pre-approved response messages to the user from a configurable list.
4. THE Platform SHALL allow the primary user to revoke companion access at any time from the User_Profile settings, with access removed within 5 seconds of revocation.
5. THE Companion_Mode SHALL NOT expose the primary user's account credentials, payment information, or private messages outside the shared communication session.

---

### Requirement 18: Progressive Web App and Offline Support

**User Story:** As a user with a disability, I want the Platform to work reliably even without an internet connection, so that I can communicate in environments with poor connectivity.

#### Acceptance Criteria

1. THE Platform SHALL be installable as a Progressive Web App (PWA) on Android and iOS devices via the browser's "Add to Home Screen" mechanism.
2. THE Offline_Cache SHALL use service workers to cache the Platform shell, pictogram assets, and offline ML Kit translation models so that core features remain available without a network connection.
3. WHEN the device is offline, THE Platform SHALL display a persistent offline indicator and clearly communicate which features are unavailable.
4. WHEN the device reconnects to the network, THE Platform SHALL automatically sync any queued messages or data changes to Firebase within 10 seconds of reconnection.
5. THE Pictogram_Board SHALL be fully functional offline, including pictogram display, composition, and template-based sentence construction.

---

### Requirement 19: Authentication and User Security

**User Story:** As a user with a disability, I want secure and accessible authentication, so that my communication data and preferences are protected.

#### Acceptance Criteria

1. THE Platform SHALL support email/password authentication and Google Sign-In via Firebase Authentication.
2. THE Platform SHALL support biometric authentication (fingerprint or face recognition) on devices that expose the WebAuthn API, as an accessible alternative to password entry.
3. WHEN a user's session expires, THE Platform SHALL prompt the user to re-authenticate before accessing protected features, without discarding unsaved input.
4. THE Platform SHALL enforce a minimum password length of 8 characters and require at least one uppercase letter, one lowercase letter, and one number.
5. IF a user fails authentication 5 consecutive times, THEN THE Platform SHALL lock the account for 15 minutes and send a notification to the registered email address.

---

### Requirement 20: Notifications and Alerts

**User Story:** As a user with a disability, I want notifications delivered in a format I can perceive, so that I never miss important events regardless of my sensory abilities.

#### Acceptance Criteria

1. WHEN any notification or alert is triggered, THE Platform SHALL deliver it via all channels appropriate to the user's disability profile: visual banner for Deaf/Hard of Hearing users, audio chime for Blind/Low Vision users, and haptic pulse for users who have enabled haptic feedback.
2. THE Platform SHALL use Firebase Cloud Messaging (FCM) to deliver push notifications when the app is in the background or closed.
3. THE Platform SHALL ensure that visual alert animations do not exceed 3 flashes per second to comply with WCAG 2.1 guideline 2.3.1 (seizure prevention).
4. THE Platform SHALL allow users to configure notification preferences (channels, frequency, and sound/vibration intensity) from the User_Profile settings.
5. IF push notification delivery fails, THEN THE Platform SHALL display the notification as an in-app banner the next time the user opens the Platform.
