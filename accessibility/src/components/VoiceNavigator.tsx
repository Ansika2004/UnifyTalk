/**
 * VoiceNavigator — Requirement 9
 * Provides continuous Web Speech API voice command listening with:
 *   - Full command registry covering all primary navigation actions (Req 9.2)
 *   - Audio confirmation on each successfully executed command (Req 9.4)
 *   - Help overlay listing all available commands (Req 9.2)
 *   - Unrecognized command prompt to retry or say "help" (Req 9.3)
 *   - Navigation action executed within 1 second of recognition (Req 9.1)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ttsEngine } from '@/services/ttsEngine'

// ─── Types aligned with design doc ───────────────────────────────────────────

export type NavigationAction =
  | 'navigate:home'
  | 'navigate:messages'
  | 'navigate:settings'
  | 'navigate:pictogram'
  | 'navigate:community'
  | 'navigate:sos'
  | 'action:send'
  | 'action:speak'
  | 'action:help'

export interface VoiceCommand {
  /** Primary utterance shown in the help overlay */
  utterance: string
  /** Semantic action identifier */
  action: NavigationAction
  /** All recognized aliases including the primary utterance */
  aliases: string[]
  /** Human-readable description for the help overlay */
  description: string
}

// ─── Command Registry (task 5.4.2) ───────────────────────────────────────────
// Covers all primary navigation actions as required by Req 9.2

export const VOICE_COMMAND_REGISTRY: VoiceCommand[] = [
  {
    utterance: 'go home',
    action: 'navigate:home',
    aliases: ['go home', 'home', 'main page', 'dashboard'],
    description: 'Navigate to home / dashboard',
  },
  {
    utterance: 'go to messages',
    action: 'navigate:messages',
    aliases: ['go to messages', 'messages', 'chat', 'go to chat', 'open chat'],
    description: 'Open chat / messages',
  },
  {
    utterance: 'go to settings',
    action: 'navigate:settings',
    aliases: ['go to settings', 'settings', 'open settings', 'preferences'],
    description: 'Open settings',
  },
  {
    utterance: 'go to pictogram board',
    action: 'navigate:pictogram',
    aliases: [
      'go to pictogram board',
      'pictogram board',
      'pictograms',
      'aac board',
      'go to pictograms',
      'open pictograms',
    ],
    description: 'Open pictogram / AAC board',
  },
  {
    utterance: 'go to community',
    action: 'navigate:community',
    aliases: ['go to community', 'community', 'forum', 'go to forum', 'open community'],
    description: 'Open community forum',
  },
  {
    utterance: 'sos',
    action: 'navigate:sos',
    aliases: ['sos', 'emergency', 'help me', 'send sos', 'emergency alert'],
    description: 'Activate SOS emergency alert',
  },
  {
    utterance: 'send message',
    action: 'action:send',
    aliases: ['send message', 'send', 'submit message', 'send it'],
    description: 'Send the current message',
  },
  {
    utterance: 'speak text',
    action: 'action:speak',
    aliases: [
      'speak text',
      'speak',
      'read aloud',
      'text to speech',
      'go to speak',
      'open speak',
      'tts',
    ],
    description: 'Open text-to-speech / speak page',
  },
  {
    utterance: 'help',
    action: 'action:help',
    aliases: ['help', 'show help', 'what can i say', 'list commands', 'commands'],
    description: 'Show all available voice commands',
  },
]

// ─── Matcher ──────────────────────────────────────────────────────────────────

export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const lower = transcript.toLowerCase().trim()
  return (
    VOICE_COMMAND_REGISTRY.find((cmd) =>
      cmd.aliases.some((alias) => lower.includes(alias)),
    ) ?? null
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceNavigator() {
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  /** Audio confirmation + status display (task 5.4.3) */
  const confirm = useCallback((msg: string) => {
    ttsEngine.speak(msg)
    setStatusMessage(msg)
  }, [])

  /** Execute a matched command's navigation action */
  const executeAction = useCallback(
    (cmd: VoiceCommand) => {
      switch (cmd.action) {
        case 'navigate:home':
          navigate('/')
          confirm('Going home')
          break
        case 'navigate:messages':
          navigate('/chat')
          confirm('Opening messages')
          break
        case 'navigate:settings':
          navigate('/settings')
          confirm('Opening settings')
          break
        case 'navigate:pictogram':
          navigate('/pictograms')
          confirm('Opening pictogram board')
          break
        case 'navigate:community':
          navigate('/community')
          confirm('Opening community forum')
          break
        case 'navigate:sos':
          navigate('/sos')
          confirm('Activating SOS emergency alert')
          break
        case 'action:send':
          // Dispatch a custom event that the active chat/TTS component can listen to
          window.dispatchEvent(new CustomEvent('voice:send'))
          confirm('Sending message')
          break
        case 'action:speak':
          navigate('/tts')
          confirm('Opening speak page')
          break
        case 'action:help':
          setShowHelp(true)
          confirm('Showing available commands')
          break
      }
    },
    [navigate, confirm],
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setActive(false)
  }, [])

  const startListening = useCallback(() => {
    const SR =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition

    if (!SR) {
      ttsEngine.speak('Voice navigation is not supported in this browser.')
      setStatusMessage('Voice navigation not supported in this browser.')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? ''
      const cmd = matchVoiceCommand(transcript)
      if (cmd) {
        // Execute within the same event tick — satisfies Req 9.1 (< 1 second)
        executeAction(cmd)
      } else {
        // Unrecognized command prompt (task 5.4.5 / Req 9.3)
        const prompt = "Command not recognized. Please repeat or say 'help' for available commands."
        ttsEngine.speak(prompt)
        setStatusMessage(`Not recognized: "${transcript}"`)
      }
    }

    recognition.onerror = () => {
      setActive(false)
      setStatusMessage('Voice recognition error. Please try again.')
    }

    recognition.onend = () => {
      // Auto-restart if still supposed to be active (continuous mode)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          setActive(false)
        }
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setActive(true)
    ttsEngine.speak("Voice navigation active. Say 'help' for available commands.")
    setStatusMessage("Listening… say 'help' for commands")
  }, [executeAction])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null // prevent auto-restart
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={active ? stopListening : startListening}
        aria-label={active ? 'Stop voice navigation' : 'Start voice navigation'}
        aria-pressed={active}
        className={`fixed top-4 right-4 z-[9996] rounded-full px-3 py-2 text-sm font-medium shadow-lg transition-colors ${
          active ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
        }`}
      >
        {active ? '🎤 Listening…' : '🎤 Voice Nav'}
      </button>

      {/* Status / last command display */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed top-14 right-4 z-[9996] rounded bg-black/70 text-white text-xs px-3 py-1 max-w-[220px] break-words"
        >
          {statusMessage}
        </div>
      )}

      {/* Help overlay (task 5.4.4) */}
      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Voice navigation commands"
          className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelp(false)
          }}
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-bold mb-1" id="voice-help-title">
              Voice Commands
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Say any of the phrases below while voice navigation is active.
            </p>
            <ul className="space-y-2" aria-labelledby="voice-help-title">
              {VOICE_COMMAND_REGISTRY.map((cmd) => (
                <li key={cmd.action} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span
                    className="font-mono bg-gray-100 px-1 rounded text-purple-700"
                    aria-label={`Say: ${cmd.utterance}`}
                  >
                    "{cmd.utterance}"
                  </span>
                  <span className="text-gray-600 ml-2">— {cmd.description}</span>
                  {cmd.aliases.length > 1 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Also: {cmd.aliases.filter((a) => a !== cmd.utterance).join(', ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Close voice commands help overlay"
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default VoiceNavigator
