import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
  ariaLabel: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: '🏠', ariaLabel: 'Go to Home' },
  { to: '/tts', label: 'Communicate', icon: '💬', ariaLabel: 'Go to Communicate' },
  { to: '/sign-language', label: 'Sign', icon: '🤟', ariaLabel: 'Go to Sign Language' },
  { to: '/chat', label: 'Chat', icon: '✉️', ariaLabel: 'Go to Chat' },
  { to: '/community', label: 'Community', icon: '👥', ariaLabel: 'Go to Community' },
  { to: '/settings', label: 'Settings', icon: '⚙️', ariaLabel: 'Go to Settings' },
]

export function BottomNav() {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-dark-surface dark:border-dark-border"
    >
      <ul className="flex items-stretch justify-around h-16" role="list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              aria-label={item.ariaLabel}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px]',
                  'text-xs font-medium transition-colors',
                  isActive
                    ? 'text-blue-700 dark:text-dark-accent'
                    : 'text-gray-500 hover:text-blue-600 dark:text-dark-muted dark:hover:text-dark-accent',
                ].join(' ')
              }
            >
              <span className="text-xl leading-none mb-0.5" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
