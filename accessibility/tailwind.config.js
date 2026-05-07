/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        'a11y-sm': '14px',
        'a11y-md': '18px',
        'a11y-lg': '24px',
        'a11y-xl': '32px',
      },
      colors: {
        // High-contrast palette (7:1+ contrast ratio)
        hc: {
          bg: '#000000',
          text: '#ffffff',
          primary: '#ffff00',
          border: '#ffffff',
          focus: '#00ffff',
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
