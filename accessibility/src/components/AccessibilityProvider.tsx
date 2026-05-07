import { useEffect, type ReactNode } from 'react'
import { useAccessibilityStore, FONT_SIZE_MAP } from '../store/accessibilityStore'

interface Props {
  children: ReactNode
}

/**
 * Applies accessibility preferences (font size, contrast mode) to the DOM
 * as CSS custom properties and body class names — without page reload.
 * Requirements: 1.2, 1.3, 11.2, 11.3
 */
export default function AccessibilityProvider({ children }: Props) {
  const { preferences } = useAccessibilityStore()

  // Apply font size as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--font-size-base',
      FONT_SIZE_MAP[preferences.fontSize],
    )
  }, [preferences.fontSize])

  // Apply contrast mode as body class
  useEffect(() => {
    document.body.classList.remove('high-contrast', 'dark-mode')
    if (preferences.contrastMode === 'high-contrast') {
      document.body.classList.add('high-contrast')
    } else if (preferences.contrastMode === 'dark') {
      document.body.classList.add('dark-mode')
    }
  }, [preferences.contrastMode])

  return <>{children}</>
}
