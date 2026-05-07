/**
 * AI Doctor Chat — uses Claude API to power Dr. AI responses.
 * Acts as a compassionate, accessible medical AI assistant for hospital patients.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-3-haiku-20240307'

const SYSTEM_PROMPT = `You are Dr. AI, a compassionate and accessible AI medical assistant helping hospital patients who may have difficulty speaking or communicating. 

Your role:
- Respond warmly and clearly to patient messages about symptoms, pain, needs, or concerns
- Use simple, plain language — avoid complex medical jargon
- Ask one focused follow-up question at a time to understand the patient's condition
- If a patient reports severe symptoms (chest pain, difficulty breathing, severe pain), immediately advise them to press the SOS button and alert nursing staff
- Keep responses concise (2-4 sentences max) so they are easy to read
- Be reassuring and patient — many users communicate via pictograms or sign language
- Never diagnose conditions definitively — always recommend consulting the care team for diagnosis
- If asked about medications, explain what they are for in simple terms but defer dosing decisions to the care team

Always start your first response by introducing yourself briefly.`

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Send a message to Dr. AI and get a response.
 * Maintains conversation history for context.
 */
export async function askDrAI(
  history: ChatTurn[],
  newMessage: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY as string | undefined

  // Fallback when no API key configured
  if (!apiKey) {
    return getDemoResponse(newMessage)
  }

  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user' as const, content: newMessage },
  ]

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    return (data.content?.[0]?.text ?? 'I apologize, I could not process your message. Please press the call button to reach a nurse.') as string
  } catch {
    return 'I\'m having trouble connecting right now. Please press the call button to reach a nurse directly.'
  }
}

/** Demo responses when no API key is set */
function getDemoResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('pain') || lower.includes('hurt')) {
    return 'I\'m sorry to hear you\'re in pain. Can you point to where it hurts, or use the symptom board to show me the location and type of pain? I\'ll make sure the care team is informed right away.'
  }
  if (lower.includes('water') || lower.includes('thirsty') || lower.includes('drink')) {
    return 'I\'ll let your nurse know you need water. They should be with you shortly. Is there anything else you need?'
  }
  if (lower.includes('breathe') || lower.includes('breath') || lower.includes('chest')) {
    return '⚠️ Breathing difficulties are urgent. Please press the red SOS button immediately so a nurse can come to you right away.'
  }
  if (lower.includes('medicine') || lower.includes('medication') || lower.includes('pill')) {
    return 'I can see your medication schedule. Your care team manages your medication timing. Would you like me to alert a nurse about your medication?'
  }
  if (lower.includes('family') || lower.includes('call')) {
    return 'I can help you reach your family. Would you like me to send them a message through the Family Connect feature?'
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! I\'m Dr. AI, your AI medical assistant. I\'m here to help you communicate with your care team. How are you feeling right now?'
  }
  return 'Thank you for letting me know. I\'ve noted this and will make sure your care team is aware. Is there anything specific you need help with right now?'
}
