import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRouter from './router'
import { AccessibilityProvider } from './context/AccessibilityContext'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#dc2626', background: '#fff', minHeight: '100vh' }}>
          <h2>App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {(this.state.error as Error).message}
            {'\n'}
            {(this.state.error as Error).stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AccessibilityProvider>
          <AppRouter />
        </AccessibilityProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
