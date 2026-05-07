import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        'a11y-sm': ['14px', { lineHeight: '1.5' }],
        'a11y-md': ['18px', { lineHeight: '1.6' }],
        'a11y-lg': ['24px', { lineHeight: '1.6' }],
        'a11y-xl': ['32px', { lineHeight: '1.5' }],
      },
      colors: {
        'hc-bg': '#000000',
        'hc-text': '#ffffff',
        'hc-link': '#ffff00',
        'hc-border': '#ffffff',
        'hc-focus': '#ffff00',
        'dark-bg': '#121212',
        'dark-surface': '#1e1e1e',
        'dark-text': '#e0e0e0',
        'dark-muted': '#9e9e9e',
        'dark-border': '#333333',
        'dark-accent': '#90caf9',
      },
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

export default config
