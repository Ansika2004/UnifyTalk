import React from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'

/**
 * Validates that a :token param is present in the URL.
 * Actual server-side token validation (expiry, revocation) is handled in task 22.1.
 */
const FamilyGuard: React.FC = () => {
  const { token } = useParams<{ token: string }>()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default FamilyGuard
