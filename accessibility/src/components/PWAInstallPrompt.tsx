import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWAInstallPrompt — listens for the browser's `beforeinstallprompt` event
 * and shows a dismissible banner inviting the user to install the app.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Install UnifyTalk app"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl shadow-xl p-4 flex items-center gap-3"
          style={{ background: 'var(--color-bg)', border: '2px solid var(--color-primary)' }}
        >
          <span aria-hidden="true" className="text-3xl">📲</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Install UnifyTalk
            </p>
            <p className="text-xs opacity-70" style={{ color: 'var(--color-text)' }}>
              Add to your home screen for offline access
            </p>
          </div>
          <button
            onClick={handleInstall}
            aria-label="Install app"
            className="px-3 py-2 rounded-lg text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--color-primary)', minHeight: '44px' }}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="px-2 py-2 rounded-lg text-sm opacity-60 shrink-0"
            style={{ color: 'var(--color-text)', minHeight: '44px' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PWAInstallPrompt
