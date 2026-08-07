/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      // Image uploads hit a Pages Function, which the Vite dev server knows
      // nothing about. Run `pnpm dev:functions` alongside `pnpm dev` to serve
      // it locally; without that, uploads are the only thing that breaks in
      // dev. See R2-SETUP.md.
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true
      }
    }
  },
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
