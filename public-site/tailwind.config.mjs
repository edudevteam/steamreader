/** @type {import('tailwindcss').Config} */

export default {
  content: ['./src/**/*.{mjs,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        steam: {
          science: '#3B82F6',
          technology: '#10B981',
          engineering: '#F59E0B',
          arts: '#EC4899',
          mathematics: '#8B5CF6'
        },
        brand: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#9333ea',
          600: '#673ab7',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764'
        }
      },
      typography: {
        DEFAULT: {
          css: {
            'code': {
              backgroundColor: '#f3f4f6',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            },
          }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
