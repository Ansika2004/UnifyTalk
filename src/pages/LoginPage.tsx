import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signInWithEmailAndPassword } from '@firebase/auth'
import { getFirestore, doc, getDoc } from '@firebase/firestore'
import { firebaseApp } from '../firebase'

type Role = 'patient' | 'staff'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('patient')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const auth = getAuth(firebaseApp)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const uid = credential.user.uid

      // Determine role: check /staff/{uid} in Firestore
      const db = getFirestore(firebaseApp)
      const staffDoc = await getDoc(doc(db, 'staff', uid))
      const isStaff = staffDoc.exists()

      navigate(isStaff ? '/staff' : '/patient', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
      }}
    >
      <h1>UnifyTalk Medical</h1>
      <p>Please sign in to continue.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '360px' }}
        aria-label="Sign in form"
      >
        <div style={{ display: 'flex', gap: '1rem' }} role="group" aria-labelledby="role-label">
          <span id="role-label" style={{ alignSelf: 'center', fontWeight: 'bold' }}>Role:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="radio"
              name="role"
              value="patient"
              checked={role === 'patient'}
              onChange={() => setRole('patient')}
            />
            Patient
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="radio"
              name="role"
              value="staff"
              checked={role === 'staff'}
              onChange={() => setRole('staff')}
            />
            Staff
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ fontSize: '1rem', padding: '0.5rem' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ fontSize: '1rem', padding: '0.5rem' }}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: 'red', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ fontSize: '1rem', padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
