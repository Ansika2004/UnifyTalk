import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * OfflineIndicator — shows a persistent banner when the browser reports
 * navigator.onLine === false, and hides it when connectivity is restored.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          role="status"
          aria-live="assertive"
          aria-label="You are offline"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white"
          style={{ background: '#b91c1c' }}
        >
          <span aria-hidden="true">📡</span>
          <span>You're offline — some features may be unavailable</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OfflineIndicator
