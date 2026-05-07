/**
 * SOS_Module — fixed-position emergency alert button.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Timestamp } from '@firebase/firestore'
import { dispatchWithRetry, dispatchSOS, writeSOSAlert, SOS_HOLD_THRESHOLD_MS } from '../services/sosService'

export interface SOSModuleProps {
  patientId: string
  wardId: string
}

const EMERGENCY_MESSAGES = [
  "I can't breathe",
  'I need pain relief',
  'I feel dizzy',
  'I need water',
  'Call my family',
]

type SOSState = 'idle' | 'holding' | 'picker' | 'sending' | 'sent' | 'failed'

export const SOSModule: React.FC<SOSModuleProps> = ({ patientId, wardId }) => {
  const [sosState, setSosState] = useState<SOSState>('idle')
  const [holdProgress, setHoldProgress] = useState(0) // 0–1
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const holdStartRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelHold()
    }
  }, [])

  function startHold() {
    if (sosState !== 'idle') return
    setSosState('holding')
    setHoldProgress(0)
    holdStartRef.current = Date.now()

    // Animate progress ring
    function animate() {
      if (holdStartRef.current === null) return
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min(elapsed / SOS_HOLD_THRESHOLD_MS, 1)
      setHoldProgress(progress)
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)

    // Trigger after threshold
    holdTimerRef.current = setTimeout(() => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      setHoldProgress(1)
      setSosState('picker')
    }, SOS_HOLD_THRESHOLD_MS)
  }

  function cancelHold() {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    holdStartRef.current = null
  }

  function releaseHold() {
    if (sosState !== 'holding') return
    cancelHold()
    setSosState('idle')
    setHoldProgress(0)
  }

  const handleMessageSelect = useCallback(
    async (message: string) => {
      setSosState('sending')
      setStatusMessage(null)

      const alertPayload = {
        patientId,
        wardId,
        selectedMessage: message,
        deliveryStatus: 'pending' as const,
        retryCount: 0,
        timestamp: Timestamp.fromDate(new Date()),
      }

      let retryCount = 0
      try {
        retryCount = await dispatchWithRetry(
          () => dispatchSOS({ ...alertPayload, deliveryStatus: 'pending' }),
          3,
          500,
        )

        // Write audit log to Firestore
        await writeSOSAlert({
          ...alertPayload,
          deliveryStatus: 'delivered',
          retryCount,
        })

        setSosState('sent')
        setStatusMessage('✓ Emergency alert sent. Help is on the way.')
      } catch {
        // Write failed audit log
        try {
          await writeSOSAlert({
            ...alertPayload,
            deliveryStatus: 'failed',
            retryCount: 3,
          })
        } catch {
          // Best-effort audit write
        }
        setSosState('failed')
        setStatusMessage('⚠ Alert could not be delivered. Please press the call button.')
      }

      // Auto-reset after 8 seconds
      setTimeout(() => {
        setSosState('idle')
        setHoldProgress(0)
        setStatusMessage(null)
      }, 8000)
    },
    [patientId, wardId],
  )

  function dismissPicker() {
    setSosState('idle')
    setHoldProgress(0)
  }

  // Circumference of the SVG countdown ring
  const RADIUS = 32
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const strokeDashoffset = CIRCUMFERENCE * (1 - holdProgress)

  return (
    <>
      {/* Fixed SOS button — always visible, z-index 9999 */}
      <button
        aria-label="SOS Emergency Alert — press and hold for 2 seconds"
        aria-live="polite"
        onMouseDown={startHold}
        onMouseUp={releaseHold}
        onMouseLeave={releaseHold}
        onTouchStart={(e) => { e.preventDefault(); startHold() }}
        onTouchEnd={(e) => { e.preventDefault(); releaseHold() }}
        onTouchCancel={(e) => { e.preventDefault(); releaseHold() }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: sosState === 'sent' ? '#16a34a' : sosState === 'failed' ? '#dc2626' : '#dc2626',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(220,38,38,0.5)',
          padding: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* Countdown ring SVG */}
        <svg
          width={72}
          height={72}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle cx={36} cy={36} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={4} />
          {/* Progress arc */}
          {sosState === 'holding' && (
            <circle
              cx={36}
              cy={36}
              r={RADIUS}
              fill="none"
              stroke="#fff"
              strokeWidth={4}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          )}
        </svg>

        {/* SOS label */}
        <span
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: 1,
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          SOS
        </span>
      </button>

      {/* Status message banner */}
      {statusMessage && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: 108,
            right: 16,
            left: 16,
            background: sosState === 'sent' ? '#16a34a' : '#dc2626',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            zIndex: 9999,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Emergency message picker modal */}
      {sosState === 'picker' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select emergency message"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: 22,
                fontWeight: 700,
                color: '#dc2626',
                textAlign: 'center',
              }}
            >
              What do you need?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EMERGENCY_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  onClick={() => handleMessageSelect(msg)}
                  style={{
                    padding: '14px 16px',
                    fontSize: 17,
                    fontWeight: 600,
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {msg}
                </button>
              ))}
            </div>
            <button
              onClick={dismissPicker}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '12px',
                fontSize: 15,
                background: 'transparent',
                border: '2px solid #6b7280',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sending overlay */}
      {sosState === 'sending' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Sending emergency alert…
          </div>
        </div>
      )}
    </>
  )
}

export default SOSModule
