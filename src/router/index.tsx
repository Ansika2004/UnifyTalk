import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import PatientGuard from './guards/PatientGuard'
import StaffGuard from './guards/StaffGuard'
import FamilyGuard from './guards/FamilyGuard'

import PatientShell from '../layouts/PatientShell'
import StaffShell from '../layouts/StaffShell'
import FamilyShell from '../layouts/FamilyShell'
import CoverPage from '../pages/CoverPage'
import AuthPage from '../pages/AuthPage'

const PictogramBoard = lazy(() => import('../components/PictogramBoard'))
const SymptomCommunicator = lazy(() => import('../components/SymptomCommunicator'))
const SignLanguageTranslator = lazy(() => import('../components/SignLanguageTranslator'))
const MentalHealthModule = lazy(() => import('../components/MentalHealthModule'))
const RecordsViewer = lazy(() => import('../components/RecordsViewer'))
const DoctorBridge = lazy(() => import('../components/DoctorBridge'))
const VitalsDashboard = lazy(() => import('../components/VitalsDashboard'))
const CalmCorner = lazy(() => import('../components/CalmCorner'))
const VoiceProfileRecorder = lazy(() => import('../components/VoiceProfileRecorder'))
const EyeGazeController = lazy(() => import('../components/EyeGazeController'))
const StaffDashboard = lazy(() => import('../pages/StaffDashboard'))

const DEMO_PATIENT_ID = 'demo-patient'
const DEMO_CHANNEL_ID = 'demo-channel'

const Loading = () => (
  <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.25rem', color: '#6b7280' }}>
    Loading…
  </div>
)

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<CoverPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />

          <Route element={<PatientGuard />}>
            <Route path="/patient" element={<PatientShell />}>
              <Route index element={<Navigate to="chat" replace />} />
              <Route path="chat" element={<DoctorBridge channelId={DEMO_CHANNEL_ID} currentUserId={DEMO_PATIENT_ID} senderRole="patient" assignedStaffName="Dr. AI" assignedStaffRole="AI Medical Assistant" />} />
              <Route path="symptoms" element={<SymptomCommunicator patientId={DEMO_PATIENT_ID} />} />
              <Route path="pictograms" element={<PictogramBoard onSend={(s) => console.log('sent', s)} />} />
              <Route path="sign-language" element={<SignLanguageTranslator />} />
              <Route path="mental-health" element={<MentalHealthModule patientId={DEMO_PATIENT_ID} roomNumber="101" />} />
              <Route path="records" element={<RecordsViewer patientId={DEMO_PATIENT_ID} />} />
              <Route path="vitals" element={<VitalsDashboard patientId={DEMO_PATIENT_ID} />} />
              <Route path="calm-corner" element={<CalmCorner />} />
              <Route path="voice-profile" element={<VoiceProfileRecorder patientId={DEMO_PATIENT_ID} />} />
              <Route path="settings" element={<EyeGazeController showRecalibrate />} />
              <Route path="medication" element={<div style={{ padding: '2rem' }}><h2>Medication Reminders</h2><p style={{ color: '#6b7280' }}>No scheduled medications.</p></div>} />
            </Route>
          </Route>

          <Route element={<StaffGuard />}>
            <Route path="/staff" element={<StaffShell />}>
              <Route index element={<StaffDashboard />} />
              <Route path="*" element={<StaffDashboard />} />
            </Route>
          </Route>

          <Route path="/family/:token" element={<FamilyGuard />}>
            <Route index element={<FamilyShell />} />
            <Route path="*" element={<FamilyShell />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter
