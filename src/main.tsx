import React from 'react'
import ReactDOM from 'react-dom/client'

// Initialize Firebase before anything else
import './firebase'

// Initialize i18next
import './i18n'

import './styles/theme.css'
import AppRouter from './router/index'
import AccessibilityProvider from './components/AccessibilityProvider'
import I18nSync from './components/I18nSync'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#dc2626' }}>
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
      <AccessibilityProvider>
        <I18nSync />
        <AppRouter />
      </AccessibilityProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
