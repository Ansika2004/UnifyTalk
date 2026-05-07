import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '../layouts/AppShell'

// Phase 1 — Foundation
const Home = lazy(() => import('../pages/Home'))
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'))

// Phase 2 — Communication Core
const PictogramBoard = lazy(() => import('../pages/PictogramBoardPage'))
const TTSPage = lazy(() => import('../pages/TTSPage'))

// Phase 3 — Sign Language + Captions
const SignLanguagePage = lazy(() => import('../pages/SignLanguagePage'))
const LiveCaptionsPage = lazy(() => import('../pages/LiveCaptionsPage'))

// Phase 4 — Chat + Translation
const ChatPage = lazy(() => import('../pages/ChatPage'))

// Phase 5 — Screen Reader + Community
const CommunityPage = lazy(() => import('../pages/CommunityPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

// Phase 6 — Extra Features
const ProgressPage = lazy(() => import('../pages/ProgressPage'))
const BuddyPage = lazy(() => import('../pages/BuddyPage'))
const CaregiverPage = lazy(() => import('../pages/CaregiverPage'))
const AACBoardBuilderPage = lazy(() => import('../pages/AACBoardBuilderPage'))
const SignLanguageLearningPage = lazy(() => import('../pages/SignLanguageLearningPage'))
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'))

/** Full-screen loading fallback shown while a lazy chunk is fetching */
const PageLoader = () => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading page"
    className="flex flex-col items-center justify-center min-h-screen gap-4"
    style={{ color: 'var(--color-text)' }}
  >
    {/* Accessible spinner */}
    <svg
      aria-hidden="true"
      className="animate-spin"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
    <span className="text-sm opacity-70">Loading…</span>
  </div>
)

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/pictograms" element={<PictogramBoard />} />
          <Route path="/tts" element={<TTSPage />} />
          <Route path="/sign-language" element={<SignLanguagePage />} />
          <Route path="/captions" element={<LiveCaptionsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/buddy" element={<BuddyPage />} />
          <Route path="/caregiver" element={<CaregiverPage />} />
          <Route path="/aac-builder" element={<AACBoardBuilderPage />} />
          <Route path="/sign-learning" element={<SignLanguageLearningPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

// Keep default export for backward compat
export default AppRouter
