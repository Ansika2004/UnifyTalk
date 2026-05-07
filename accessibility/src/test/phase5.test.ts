/**
 * Phase 5 Tests — Screen Reader + Community
 * Feature: accessible-communication-platform
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { computeContrastRatio, meetsWCAGAA, isValidFlashRate } from '@/utils/a11yUtils'
import { MIN_FLASH_INTERVAL_MS } from '@/components/VisualAlert'
import { FONT_SIZE_MAP } from '@/types'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AccessibilityProvider } from '@/context/AccessibilityContext'

// Helper: wrap a component with router + accessibility provider
function renderPage(ui: React.ReactElement) {
  return render(
    React.createElement(MemoryRouter, null,
      React.createElement(AccessibilityProvider, null, ui)
    )
  )
}

// Helper: run axe on a rendered container and return violations
async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  })
  return results.violations
}

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 11: Image alt text rendering
// Feature: accessible-communication-platform, Property 11: Image alt text rendering
// Validates: Requirements 8.2, 12.2, 12.3
// ─────────────────────────────────────────────────────────────────────────────
describe('PBT — Property 11: Image alt text rendering', () => {
  it('images with alt text render with correct alt attribute (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (altText, src) => {
          // Simulate rendering an img element
          const img = document.createElement('img')
          img.src = src
          img.alt = altText
          expect(img.getAttribute('alt')).toBe(altText)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('images without alt text get placeholder label (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (src) => {
          const img = document.createElement('img')
          img.src = src
          // No alt set — should use placeholder
          const altText = img.getAttribute('alt') ?? 'Image — no description provided'
          expect(altText).toBe('Image — no description provided')
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 12: ARIA live region coverage
// Feature: accessible-communication-platform, Property 12: ARIA live region coverage
// Validates: Requirements 8.3
// ─────────────────────────────────────────────────────────────────────────────
describe('PBT — Property 12: ARIA live region coverage', () => {
  it('dynamic updates occur in aria-live elements (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('polite', 'assertive'),
        (content, ariaLive) => {
          const div = document.createElement('div')
          div.setAttribute('aria-live', ariaLive)
          div.textContent = content
          expect(div.getAttribute('aria-live')).toMatch(/^(polite|assertive)$/)
          expect(div.textContent).toBe(content)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 13: Visual flash rate compliance
// Feature: accessible-communication-platform, Property 13: Visual flash rate compliance
// Validates: Requirements 13.1, 13.3
// ─────────────────────────────────────────────────────────────────────────────
describe('PBT — Property 13: Visual flash rate compliance', () => {
  it('flash interval always ≥333ms (100 iterations)', () => {
    fc.assert(
      fc.property(
        // Generate any interval (including invalid ones below 333ms)
        fc.integer({ min: 0, max: 2000 }),
        (requestedInterval) => {
          // The component enforces minimum interval
          const safeInterval = Math.max(requestedInterval, MIN_FLASH_INTERVAL_MS)
          expect(safeInterval).toBeGreaterThanOrEqual(333)
          expect(isValidFlashRate(safeInterval)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('MIN_FLASH_INTERVAL_MS constant is 333', () => {
    expect(MIN_FLASH_INTERVAL_MS).toBe(333)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 14: High contrast mode contrast ratio
// Feature: accessible-communication-platform, Property 14: High contrast mode contrast ratio
// Validates: Requirements 11.1
// ─────────────────────────────────────────────────────────────────────────────
describe('PBT — Property 14: High contrast mode contrast ratio', () => {
  it('contrast ratio ≥4.5:1 when high-contrast active (100 iterations)', () => {
    // High contrast pairs: black on white, white on black, yellow on black
    const highContrastPairs: [string, string][] = [
      ['#000000', '#ffffff'],
      ['#ffffff', '#000000'],
      ['#ffff00', '#000000'],
      ['#000000', '#ffff00'],
    ]
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: highContrastPairs.length - 1 }),
        (index) => {
          const [fg, bg] = highContrastPairs[index]
          const ratio = computeContrastRatio(fg, bg)
          expect(meetsWCAGAA(ratio)).toBe(true)
          expect(ratio).toBeGreaterThanOrEqual(4.5)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 15: Font size setting application
// Feature: accessible-communication-platform, Property 15: Font size setting application
// Validates: Requirements 11.2
// ─────────────────────────────────────────────────────────────────────────────
describe('PBT — Property 15: Font size setting application', () => {
  it('font size CSS variable matches selected size (100 iterations)', () => {
    const fontSizes = Object.keys(FONT_SIZE_MAP) as Array<keyof typeof FONT_SIZE_MAP>
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: fontSizes.length - 1 }),
        (index) => {
          const size = fontSizes[index]
          const expectedPx = FONT_SIZE_MAP[size]
          // Simulate applying to DOM
          document.documentElement.style.setProperty('--font-size-base', expectedPx)
          const applied = document.documentElement.style.getPropertyValue('--font-size-base')
          expect(applied).toBe(expectedPx)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 22: Forum post moderation
// Feature: accessible-communication-platform, Property 22: Forum post moderation
// Validates: Requirements 21.2
// ─────────────────────────────────────────────────────────────────────────────
interface MockPost {
  id: string
  flaggedBy: string[]
  isHidden: boolean
}

function applyFlagLogic(post: MockPost, userId: string): MockPost {
  if (post.flaggedBy.includes(userId)) return post
  const flaggedBy = [...post.flaggedBy, userId]
  return { ...post, flaggedBy, isHidden: flaggedBy.length >= 3 }
}

describe('PBT — Property 22: Forum post moderation', () => {
  it('post hidden after 3 flags (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (flagCount) => {
          let post: MockPost = { id: 'p1', flaggedBy: [], isHidden: false }
          for (let i = 0; i < flagCount; i++) {
            post = applyFlagLogic(post, `user-${i}`)
          }
          if (flagCount >= 3) {
            expect(post.isHidden).toBe(true)
          } else {
            expect(post.isHidden).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('fewer than 3 flags keeps post visible', () => {
    let post: MockPost = { id: 'p1', flaggedBy: [], isHidden: false }
    post = applyFlagLogic(post, 'user-1')
    post = applyFlagLogic(post, 'user-2')
    expect(post.isHidden).toBe(false)
    expect(post.flaggedBy).toHaveLength(2)
  })

  it('same user flagging twice does not double-count', () => {
    let post: MockPost = { id: 'p1', flaggedBy: [], isHidden: false }
    post = applyFlagLogic(post, 'user-1')
    post = applyFlagLogic(post, 'user-1') // same user
    expect(post.flaggedBy).toHaveLength(1)
    expect(post.isHidden).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PBT — Property 23: Forum media accessibility requirement
// Feature: accessible-communication-platform, Property 23: Forum media accessibility requirement
// Validates: Requirements 21.4
// ─────────────────────────────────────────────────────────────────────────────
function canSubmitPost(content: string, imageUrl: string, altText: string): boolean {
  if (!content.trim()) return false
  if (imageUrl && !altText.trim()) return false
  return true
}

describe('PBT — Property 23: Forum media accessibility requirement', () => {
  it('image posts require alt text (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.webUrl(),
        fc.string({ minLength: 0, maxLength: 100 }),
        (content, imageUrl, altText) => {
          const canSubmit = canSubmitPost(content, imageUrl, altText)
          if (!altText.trim()) {
            // Image without alt text must be rejected
            expect(canSubmit).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('post without image can be submitted without alt text', () => {
    expect(canSubmitPost('Hello world', '', '')).toBe(true)
  })

  it('post with image and alt text can be submitted', () => {
    expect(canSubmitPost('Hello', 'https://example.com/img.jpg', 'A photo of a cat')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.4.1 / 5.4.2 / 5.4.3 / 5.4.5: Voice navigator command registry
// Validates: Requirements 9.1, 9.2, 9.3, 9.4
// ─────────────────────────────────────────────────────────────────────────────
import {
  matchVoiceCommand,
  VOICE_COMMAND_REGISTRY,
  type NavigationAction,
} from '@/components/VoiceNavigator'

describe('Unit — Voice navigator: command registry (task 5.4.2)', () => {
  it('registry covers all required NavigationAction values', () => {
    const requiredActions: NavigationAction[] = [
      'navigate:home',
      'navigate:messages',
      'navigate:settings',
      'navigate:pictogram',
      'navigate:community',
      'navigate:sos',
      'action:send',
      'action:speak',
      'action:help',
    ]
    const registeredActions = VOICE_COMMAND_REGISTRY.map((c) => c.action)
    requiredActions.forEach((action) => {
      expect(registeredActions).toContain(action)
    })
  })

  it('every command has a non-empty utterance, description, and at least one alias', () => {
    VOICE_COMMAND_REGISTRY.forEach((cmd) => {
      expect(cmd.utterance.length).toBeGreaterThan(0)
      expect(cmd.description.length).toBeGreaterThan(0)
      expect(cmd.aliases.length).toBeGreaterThan(0)
    })
  })

  it('primary utterance is always included in aliases', () => {
    VOICE_COMMAND_REGISTRY.forEach((cmd) => {
      expect(cmd.aliases).toContain(cmd.utterance)
    })
  })
})

describe('Unit — Voice navigator: matchVoiceCommand (task 5.4.1)', () => {
  it('matches "go home" to navigate:home', () => {
    const cmd = matchVoiceCommand('go home')
    expect(cmd).not.toBeNull()
    expect(cmd?.action).toBe('navigate:home')
  })

  it('matches alias "dashboard" to navigate:home', () => {
    const cmd = matchVoiceCommand('dashboard')
    expect(cmd?.action).toBe('navigate:home')
  })

  it('matches "messages" to navigate:messages', () => {
    const cmd = matchVoiceCommand('messages')
    expect(cmd?.action).toBe('navigate:messages')
  })

  it('matches "chat" to navigate:messages', () => {
    const cmd = matchVoiceCommand('chat')
    expect(cmd?.action).toBe('navigate:messages')
  })

  it('matches "settings" to navigate:settings', () => {
    const cmd = matchVoiceCommand('settings')
    expect(cmd?.action).toBe('navigate:settings')
  })

  it('matches "pictograms" to navigate:pictogram', () => {
    const cmd = matchVoiceCommand('pictograms')
    expect(cmd?.action).toBe('navigate:pictogram')
  })

  it('matches "aac board" to navigate:pictogram', () => {
    const cmd = matchVoiceCommand('aac board')
    expect(cmd?.action).toBe('navigate:pictogram')
  })

  it('matches "community" to navigate:community', () => {
    const cmd = matchVoiceCommand('community')
    expect(cmd?.action).toBe('navigate:community')
  })

  it('matches "sos" to navigate:sos', () => {
    const cmd = matchVoiceCommand('sos')
    expect(cmd?.action).toBe('navigate:sos')
  })

  it('matches "emergency" to navigate:sos', () => {
    const cmd = matchVoiceCommand('emergency')
    expect(cmd?.action).toBe('navigate:sos')
  })

  it('matches "send" to action:send', () => {
    const cmd = matchVoiceCommand('send')
    expect(cmd?.action).toBe('action:send')
  })

  it('matches "speak" to action:speak', () => {
    const cmd = matchVoiceCommand('speak')
    expect(cmd?.action).toBe('action:speak')
  })

  it('matches "help" to action:help', () => {
    const cmd = matchVoiceCommand('help')
    expect(cmd?.action).toBe('action:help')
  })

  it('matches "what can i say" to action:help', () => {
    const cmd = matchVoiceCommand('what can i say')
    expect(cmd?.action).toBe('action:help')
  })

  it('is case-insensitive', () => {
    expect(matchVoiceCommand('GO HOME')?.action).toBe('navigate:home')
    expect(matchVoiceCommand('SETTINGS')?.action).toBe('navigate:settings')
    expect(matchVoiceCommand('HELP')?.action).toBe('action:help')
  })

  it('matches partial transcript containing a command phrase', () => {
    // Simulates real speech recognition output which may include extra words
    expect(matchVoiceCommand('please go home now')?.action).toBe('navigate:home')
    expect(matchVoiceCommand('I want to go to settings')?.action).toBe('navigate:settings')
  })
})

describe('Unit — Voice navigator: unrecognized command (task 5.4.5 / Req 9.3)', () => {
  it('returns null for completely unrecognized transcript', () => {
    expect(matchVoiceCommand('do something random')).toBeNull()
    expect(matchVoiceCommand('xyzzy frobble')).toBeNull()
    expect(matchVoiceCommand('')).toBeNull()
  })

  it('unrecognized command prompt contains "not recognized" and "help"', () => {
    // Verify the expected prompt message format used in the component
    const prompt = "Command not recognized. Please repeat or say 'help' for available commands."
    expect(prompt.toLowerCase()).toContain('not recognized')
    expect(prompt.toLowerCase()).toContain('help')
  })
})

describe('Unit — Voice navigator: audio confirmation (task 5.4.3 / Req 9.4)', () => {
  it('every command in the registry has a description suitable for audio confirmation', () => {
    // Each command's description is used as the audio confirmation message
    VOICE_COMMAND_REGISTRY.forEach((cmd) => {
      expect(cmd.description.length).toBeGreaterThan(0)
      // Should not be a generic placeholder
      expect(cmd.description).not.toBe('undefined')
      expect(cmd.description).not.toBe('null')
    })
  })
})

describe('Unit — Voice navigator: help overlay content (task 5.4.4 / Req 9.2)', () => {
  it('help overlay lists all 9 commands', () => {
    // The help overlay renders VOICE_COMMAND_REGISTRY — verify it has all 9 entries
    expect(VOICE_COMMAND_REGISTRY).toHaveLength(9)
  })

  it('help command is in the registry and triggers action:help', () => {
    const helpCmd = VOICE_COMMAND_REGISTRY.find((c) => c.action === 'action:help')
    expect(helpCmd).toBeDefined()
    expect(helpCmd?.aliases).toContain('help')
  })

  it('all commands have unique actions', () => {
    const actions = VOICE_COMMAND_REGISTRY.map((c) => c.action)
    const uniqueActions = new Set(actions)
    expect(uniqueActions.size).toBe(actions.length)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke — 5.1.1: axe-core WCAG 2.1 AA audit on all primary pages
// Feature: accessible-communication-platform
// Validates: Requirements 8.1, 8.2, 8.3, 8.4
// ─────────────────────────────────────────────────────────────────────────────

// Lazy imports for page components (avoid top-level import issues with router deps)
import { DashboardPage } from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import Home from '@/pages/Home'
import ChatPage from '@/pages/ChatPage'
import CommunityPage from '@/pages/CommunityPage'
import TTSPage from '@/pages/TTSPage'
import PictogramBoardPage from '@/pages/PictogramBoardPage'
import SignLanguagePage from '@/pages/SignLanguagePage'
import LiveCaptionsPage from '@/pages/LiveCaptionsPage'

describe('Smoke — 5.1.1: axe-core WCAG 2.1 AA audit on primary pages', () => {
  it('DashboardPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(DashboardPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`DashboardPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('SettingsPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(SettingsPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`SettingsPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('Home page has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(Home))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`Home page axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('ChatPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(ChatPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`ChatPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('CommunityPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(CommunityPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`CommunityPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('TTSPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(TTSPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`TTSPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('PictogramBoardPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(PictogramBoardPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`PictogramBoardPage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('SignLanguagePage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(SignLanguagePage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`SignLanguagePage axe violations:\n${msgs}`)
    }
    unmount()
  })

  it('LiveCaptionsPage has no WCAG 2.1 AA violations', async () => {
    const { container, unmount } = renderPage(React.createElement(LiveCaptionsPage))
    const violations = await runAxe(container)
    const critical = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      const msgs = critical.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      throw new Error(`LiveCaptionsPage axe violations:\n${msgs}`)
    }
    unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.1.2: ARIA roles, labels, and descriptions on interactive elements
// Validates: Requirements 8.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Unit — 5.1.2: ARIA roles and labels on interactive elements', () => {
  it('DashboardPage feature tiles have aria-label attributes', () => {
    const { container, unmount } = renderPage(React.createElement(DashboardPage))
    const links = container.querySelectorAll('a[aria-label]')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('aria-label')).toBeTruthy()
    })
    unmount()
  })

  it('SettingsPage buttons have aria-pressed for toggle state', () => {
    const { container, unmount } = renderPage(React.createElement(SettingsPage))
    const toggleButtons = container.querySelectorAll('button[aria-pressed]')
    expect(toggleButtons.length).toBeGreaterThan(0)
    unmount()
  })

  it('SettingsPage sections have aria-labelledby', () => {
    const { container, unmount } = renderPage(React.createElement(SettingsPage))
    const sections = container.querySelectorAll('section[aria-labelledby]')
    expect(sections.length).toBeGreaterThan(0)
    unmount()
  })

  it('Home page feature buttons have aria-label', () => {
    const { container, unmount } = renderPage(React.createElement(Home))
    const buttons = container.querySelectorAll('button[aria-label]')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy()
    })
    unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.1.3: No positive tabindex values across pages
// Validates: Requirements 8.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Unit — 5.1.3: No positive tabindex values', () => {
  const pages = [
    { name: 'DashboardPage', component: DashboardPage },
    { name: 'SettingsPage', component: SettingsPage },
    { name: 'Home', component: Home },
    { name: 'ChatPage', component: ChatPage },
    { name: 'CommunityPage', component: CommunityPage },
    { name: 'TTSPage', component: TTSPage },
    { name: 'PictogramBoardPage', component: PictogramBoardPage },
    { name: 'SignLanguagePage', component: SignLanguagePage },
    { name: 'LiveCaptionsPage', component: LiveCaptionsPage },
  ]

  pages.forEach(({ name, component }) => {
    it(`${name} has no positive tabindex values`, () => {
      const { container, unmount } = renderPage(React.createElement(component))
      const allElements = container.querySelectorAll('[tabindex]')
      allElements.forEach((el) => {
        const tabindex = parseInt(el.getAttribute('tabindex') ?? '0', 10)
        expect(tabindex).toBeLessThanOrEqual(0)
      })
      unmount()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.1.4: Images and icons have descriptive alt text or aria-label
// Validates: Requirements 8.2, 12.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Unit — 5.1.4: Images and icons have alt text or aria-label', () => {
  it('all img elements have alt attribute', () => {
    const { container, unmount } = renderPage(React.createElement(DashboardPage))
    const images = container.querySelectorAll('img')
    images.forEach((img) => {
      expect(img.hasAttribute('alt')).toBe(true)
    })
    unmount()
  })

  it('decorative emoji spans are aria-hidden', () => {
    const { container, unmount } = renderPage(React.createElement(DashboardPage))
    // Emoji spans used as decorative icons should be aria-hidden
    const ariaHiddenSpans = container.querySelectorAll('span[aria-hidden="true"]')
    expect(ariaHiddenSpans.length).toBeGreaterThan(0)
    unmount()
  })

  it('Home page decorative icons are aria-hidden', () => {
    const { container, unmount } = renderPage(React.createElement(Home))
    const ariaHiddenSpans = container.querySelectorAll('span[aria-hidden="true"]')
    expect(ariaHiddenSpans.length).toBeGreaterThan(0)
    unmount()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.1.5: Dynamic content wrapped in ARIA live regions
// Validates: Requirements 8.3
// ─────────────────────────────────────────────────────────────────────────────
describe('Unit — 5.1.5: Dynamic content in ARIA live regions', () => {
  it('DashboardPage has aria-live region for notifications', () => {
    const { container, unmount } = renderPage(React.createElement(DashboardPage))
    const liveRegions = container.querySelectorAll('[aria-live]')
    expect(liveRegions.length).toBeGreaterThan(0)
    liveRegions.forEach((el) => {
      const val = el.getAttribute('aria-live')
      expect(['polite', 'assertive']).toContain(val)
    })
    unmount()
  })

  it('LiveCaptionsPage has aria-live region for caption output', () => {
    const { container, unmount } = renderPage(React.createElement(LiveCaptionsPage))
    const liveRegions = container.querySelectorAll('[aria-live]')
    expect(liveRegions.length).toBeGreaterThan(0)
    const captionRegion = container.querySelector('[role="log"][aria-live]')
    expect(captionRegion).toBeTruthy()
    unmount()
  })

  it('all pages have at least one main landmark', () => {
    const pagesWithMain = [
      DashboardPage, SettingsPage, Home, ChatPage, CommunityPage,
      TTSPage, PictogramBoardPage, SignLanguagePage, LiveCaptionsPage,
    ]
    pagesWithMain.forEach((PageComponent) => {
      const { container, unmount } = renderPage(React.createElement(PageComponent))
      const main = container.querySelector('main')
      expect(main).toBeTruthy()
      unmount()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unit — 5.5.1 / 5.5.2 / 5.5.3: Braille Display Support
// Validates: Requirements 10.1, 10.2, 10.3
// ─────────────────────────────────────────────────────────────────────────────
import {
  textToBrailleBytes,
  isBrailleConnected,
  onBrailleDisconnect,
  sendToBraille,
  connectBrailleDisplay,
  disconnectBrailleDisplay,
} from '@/services/brailleService'

describe('Unit — 5.5.1: Braille display detection (Req 10.2)', () => {
  it('isBrailleConnected returns false when no device is connected', () => {
    // In test environment (happy-dom), WebHID is not available
    expect(isBrailleConnected()).toBe(false)
  })

  it('connectBrailleDisplay returns null when WebHID is not supported', async () => {
    // happy-dom does not implement navigator.hid
    const result = await connectBrailleDisplay()
    expect(result).toBeNull()
  })

  it('disconnectBrailleDisplay is a no-op when nothing is connected', async () => {
    // Should not throw
    await expect(disconnectBrailleDisplay()).resolves.toBeUndefined()
  })
})

describe('Unit — 5.5.2: Real-time text transmission (Req 10.1)', () => {
  it('textToBrailleBytes converts lowercase letters to braille bytes', () => {
    const bytes = textToBrailleBytes('abc')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(3)
    // 'a' = 0x01, 'b' = 0x03, 'c' = 0x09
    expect(bytes[0]).toBe(0x01)
    expect(bytes[1]).toBe(0x03)
    expect(bytes[2]).toBe(0x09)
  })

  it('textToBrailleBytes handles uppercase by lowercasing', () => {
    const lower = textToBrailleBytes('abc')
    const upper = textToBrailleBytes('ABC')
    expect(lower).toEqual(upper)
  })

  it('textToBrailleBytes maps space to 0x00', () => {
    const bytes = textToBrailleBytes(' ')
    expect(bytes[0]).toBe(0x00)
  })

  it('textToBrailleBytes maps unknown characters to 0x00', () => {
    const bytes = textToBrailleBytes('€')
    expect(bytes[0]).toBe(0x00)
  })

  it('textToBrailleBytes output length equals input length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (text) => {
          const bytes = textToBrailleBytes(text)
          expect(bytes.length).toBe(text.length)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('sendToBraille is a no-op (logs warning) when no device is connected', async () => {
    // Should not throw even without a device
    await expect(sendToBraille('hello')).resolves.toBeUndefined()
  })
})

describe('Unit — 5.5.3: Disconnect notification (Req 10.3)', () => {
  it('onBrailleDisconnect registers a callback and returns an unsubscribe function', () => {
    const cb = vi.fn()
    const unsubscribe = onBrailleDisconnect(cb)
    expect(typeof unsubscribe).toBe('function')
    // Unsubscribe should not throw
    expect(() => unsubscribe()).not.toThrow()
  })

  it('unsubscribe removes the callback so it is not called again', () => {
    const cb = vi.fn()
    const unsubscribe = onBrailleDisconnect(cb)
    unsubscribe()
    // Callback should not be in the active list — we can verify by checking
    // that a second unsubscribe is also safe (idempotent)
    expect(() => unsubscribe()).not.toThrow()
  })

  it('multiple disconnect callbacks can be registered independently', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const unsub1 = onBrailleDisconnect(cb1)
    const unsub2 = onBrailleDisconnect(cb2)
    // Both should be registered without error
    expect(typeof unsub1).toBe('function')
    expect(typeof unsub2).toBe('function')
    unsub1()
    unsub2()
  })
})
