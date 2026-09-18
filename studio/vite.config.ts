/// <reference types="vitest" />
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { studioApi } from './server/plugin'

const here = fileURLToPath(new URL('.', import.meta.url))

/**
 * The Studio shares the public site's source rather than copying it: types,
 * utils, the page sections the Designer previews, the header and footer the
 * article preview wears. A bare import like `components/page/PageSections`
 * is looked up in studio/src first and public-site/src second, so the Studio
 * can add modules of its own (and override one when it has to) while
 * everything else stays a single definition.
 */
const SOURCE_ROOTS = [join(here, 'src'), join(here, '..', 'public-site', 'src')]
const SOURCE_FOLDERS = new Set([
  'assets',
  'components',
  'context',
  'hooks',
  'lib',
  'pages',
  'router',
  'styles',
  'types',
  'utils'
])

function sharedSource(): Plugin {
  return {
    name: 'studio-shared-source',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!SOURCE_FOLDERS.has(source.split('/')[0])) return null
      for (const root of SOURCE_ROOTS) {
        const resolved = await this.resolve(join(root, source), importer, {
          ...options,
          skipSelf: true
        })
        if (resolved) return resolved
      }
      return null
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '')

  return {
    plugins: [react(), sharedSource(), studioApi(env)],
    // The public site's components resolve packages from public-site's own
    // node_modules. Two Reacts in one page breaks hooks, so these always come
    // from the Studio's copy.
    resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
    define: {
      // Shared components read content through public-site/src/lib/content.
      // Here it comes from the local server, built from studio/content, so
      // previews show unpublished work.
      'import.meta.env.VITE_CONTENT_BASE_URL': JSON.stringify('/preview-data')
    },
    server: {
      // Local only. Never expose this on the network: it has no login, and it
      // holds the R2 token.
      host: '127.0.0.1',
      port: 5180,
      strictPort: true,
      cors: false,
      fs: { allow: [join(here, '..')] }
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      environmentOptions: {
        happyDOM: { settings: { disableIframePageLoading: true } }
      },
      setupFiles: '.vitest/setup',
      include: ['**/test.{ts,tsx}'],
      exclude: ['node_modules/**']
    }
  }
})
