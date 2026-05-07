import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const PatientGuard: React.FC = () => {
  // Demo mode: bypass auth when Firebase is not configured
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  if (!apiKey) return <Outlet />

  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default PatientGuard
