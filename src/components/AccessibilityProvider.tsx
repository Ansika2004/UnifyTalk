import { useEffect } from 'react'
import { useGlobalStore, selectHighContrast, selectLargeFontEnabled } from '../store/globalStore'

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export default function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const highContrast = useGlobalStore(selectHighContrast)
  const largeFontEnabled = useGlobalStore(selectLargeFontEnabled)

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  useEffect(() => {
    document.body.classList.toggle('large-font', largeFontEnabled)
  }, [largeFontEnabled])

  return <>{children}</>
}
