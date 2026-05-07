import { BrowserRouter } from 'react-router-dom'
import { AccessibilityProvider } from '@/context/AccessibilityContext'
import { AppRouter } from '@/router'
import { BottomNav } from '@/components/BottomNav'
import { SOSButton } from '@/components/SOSButton'
import AIAssistantButton from '@/components/AIAssistantButton'
import { SkipToContent } from '@/components/SkipToContent'

export function App() {
  // In a real app, userId would come from Firebase Auth
  const userId = localStorage.getItem('userId') ?? undefined

  const emergencyContacts = (() => {
    try {
      const profile = localStorage.getItem('onboarding_profile')
      if (!profile) return []
      const parsed = JSON.parse(profile)
      return parsed.emergencyContacts ?? []
    } catch {
      return []
    }
  })()

  return (
    <BrowserRouter>
      <AccessibilityProvider userId={userId}>
        <SkipToContent />
        <AppRouter />
        <BottomNav />
        <SOSButton
          hasEmergencyContacts={emergencyContacts.length > 0}
          emergencyContacts={emergencyContacts}
          userId={userId ?? 'local-user'}
        />
        <AIAssistantButton />
      </AccessibilityProvider>
    </BrowserRouter>
  )
}
