// Feature: accessible-communication-platform
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccessibilityProvider } from '@/context/AccessibilityContext'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { SOSButton } from '@/components/SOSButton'

// Mock framer-motion so animations complete instantly in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => {
      const { initial: _i, animate: _a, exit: _e, variants: _v, transition: _t, custom: _c, ...htmlProps } = rest as Record<string, unknown>
      return <div {...(htmlProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    },
    section: ({ children, ...rest }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
      const { initial: _i, animate: _a, exit: _e, variants: _v, transition: _t, custom: _c, ...htmlProps } = rest as Record<string, unknown>
      return <section {...(htmlProps as React.HTMLAttributes<HTMLElement>)}>{children}</section>
    },
  },
}))

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <AccessibilityProvider>
        <OnboardingPage />
      </AccessibilityProvider>
    </MemoryRouter>
  )
}

/** Click "Next" and wait for the new step's content to be visible */
async function clickNext() {
  const nextBtn = screen.getByLabelText('Go to next step')
  await act(async () => { fireEvent.click(nextBtn) })
}

describe('Onboarding — disability type and communication mode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders disability type checkboxes on step 1', () => {
    renderOnboarding()
    expect(screen.getByLabelText('Deaf')).toBeInTheDocument()
    expect(screen.getByLabelText('Hard of Hearing')).toBeInTheDocument()
    expect(screen.getByLabelText('Mute')).toBeInTheDocument()
    expect(screen.getByLabelText('Non-verbal')).toBeInTheDocument()
    expect(screen.getByLabelText('Blind')).toBeInTheDocument()
    expect(screen.getByLabelText('Low Vision')).toBeInTheDocument()
  })

  it('allows selecting multiple disability types', () => {
    renderOnboarding()
    const deafCheckbox = screen.getByLabelText('Deaf') as HTMLInputElement
    const muteCheckbox = screen.getByLabelText('Mute') as HTMLInputElement

    fireEvent.click(deafCheckbox)
    fireEvent.click(muteCheckbox)

    expect(deafCheckbox.checked).toBe(true)
    expect(muteCheckbox.checked).toBe(true)
  })

  it('shows communication mode selector on step 2', async () => {
    renderOnboarding()

    await clickNext()

    // AnimatePresence may keep both steps briefly; use waitFor to wait for new step
    await waitFor(() => expect(screen.getByLabelText('Pictogram Board')).toBeInTheDocument())
    expect(screen.getByLabelText('Text')).toBeInTheDocument()
    expect(screen.getByLabelText('Sign Language')).toBeInTheDocument()
    expect(screen.getByLabelText('Voice')).toBeInTheDocument()
  })

  it('saves disability type and communication mode to localStorage on completion', async () => {
    renderOnboarding()

    // Step 1: select disability type
    fireEvent.click(screen.getByLabelText('Deaf'))
    await clickNext()

    // Step 2: select communication mode — wait for it to appear
    await waitFor(() => expect(screen.getByLabelText('Pictogram Board')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Pictogram Board'))
    await clickNext()

    // Step 3: language — wait for it to appear
    await waitFor(() => expect(screen.getByLabelText('Language preference')).toBeInTheDocument())
    await clickNext()

    // Step 4: accessibility prefs — wait for it to appear
    await waitFor(() => expect(screen.getByLabelText('Go to next step')).toBeInTheDocument())
    await clickNext()

    // Step 5: emergency contact — wait for it to appear
    await waitFor(() => expect(screen.getByLabelText('Contact 1 name')).toBeInTheDocument())
    const nameInput = screen.getByLabelText('Contact 1 name')
    const phoneInput = screen.getByLabelText('Contact 1 phone')
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })
    fireEvent.change(phoneInput, { target: { value: '1234567890' } })

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Complete onboarding'))
    })

    const saved = JSON.parse(localStorage.getItem('onboarding_profile') ?? '{}')
    expect(saved.disabilityTypes).toContain('deaf')
    expect(saved.preferredCommunicationMode).toBe('pictogram')
    expect(saved.emergencyContacts[0].name).toBe('Jane Doe')
  })

  it('shows error when completing without emergency contact', async () => {
    renderOnboarding()

    // Navigate through steps 0→1→2→3 (each has "Go to next step")
    for (let i = 0; i < 3; i++) {
      await clickNext()
      await waitFor(() => expect(screen.getByLabelText('Go to next step')).toBeInTheDocument())
    }
    // Navigate step 3→4 (step 4 has "Complete onboarding" instead)
    await clickNext()

    // Wait for final step
    await waitFor(() => expect(screen.getByLabelText('Complete onboarding')).toBeInTheDocument())

    // Try to complete without filling in contact
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Complete onboarding'))
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/emergency contact/i)
  })
})

describe('SOSButton — emergency contact requirement', () => {
  it('shows setup prompt when no emergency contacts configured', async () => {
    render(<SOSButton hasEmergencyContacts={false} />)

    const sosBtn = screen.getByLabelText('Emergency SOS')
    await act(async () => { fireEvent.click(sosBtn) })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Set up emergency contacts/i)).toBeInTheDocument()
    expect(screen.getByText(/at least one emergency contact/i)).toBeInTheDocument()
  })

  it('does not show setup prompt when emergency contacts are configured', async () => {
    const onSOS = vi.fn()
    render(<SOSButton hasEmergencyContacts={true} onSOS={onSOS} />)

    const sosBtn = screen.getByLabelText('Emergency SOS')
    await act(async () => { fireEvent.click(sosBtn) })

    // The setup prompt should not appear (a confirmation dialog may appear instead)
    expect(screen.queryByText(/Set up emergency contacts/i)).not.toBeInTheDocument()
    expect(onSOS).toHaveBeenCalledOnce()
  })

  it('SOS button is always visible in the DOM', () => {
    render(<SOSButton hasEmergencyContacts={false} />)
    expect(screen.getByLabelText('Emergency SOS')).toBeInTheDocument()
  })

  it('dismisses setup prompt when cancel is clicked', async () => {
    render(<SOSButton hasEmergencyContacts={false} />)

    await act(async () => { fireEvent.click(screen.getByLabelText('Emergency SOS')) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => { fireEvent.click(screen.getByText('Cancel')) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
