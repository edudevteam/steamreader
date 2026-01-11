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
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
