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
