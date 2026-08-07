/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // Article fixtures embed YouTube iframes; without this happy-dom tries to
    // fetch them and the failed loads surface as unhandled rejections.
    environmentOptions: {
      happyDOM: { settings: { disableIframePageLoading: true } }
    },
    setupFiles: '.vitest/setup',
    include: ['**/test.{ts,tsx}']
  }
})
