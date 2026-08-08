import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * `lazy()` that survives a deploy landing underneath an already-open tab.
 *
 * Vite fingerprints every chunk, so once a new build goes out the hashed file a
 * loaded page still wants -- `/assets/index-DQPs7ySK.js` -- no longer exists.
 * Cloudflare Pages answers the miss with the SPA fallback (index.html), the
 * browser refuses to evaluate HTML as a module, and the import rejects with
 * "Failed to fetch dynamically imported module". Readers almost never hit it
 * because the public pages are eagerly bundled; the CMS is lazy, so it lands on
 * whoever opens the Content Studio first after a release.
 *
 * One retry covers an ordinary network blip. If that fails too the chunk really
 * is gone and only a reload can pick up the new index.html -- guarded by a
 * session flag so a genuinely broken build surfaces the error instead of
 * reloading forever.
 */

const RELOAD_FLAG = 'steamreader:stale-chunk-reload'

function alreadyReloaded() {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG) !== null
  } catch {
    // Safari's private mode throws on sessionStorage. Without somewhere to
    // record the attempt, assume we already made one rather than risk a loop.
    return true
  }
}

function markReloaded() {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    // Nothing to do -- see alreadyReloaded().
  }
}

function clearReloaded() {
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    // Nothing to do -- see alreadyReloaded().
  }
}

export function lazyWithRetry<
  // Mirrors React's own constraint on lazy(); anything narrower rejects class
  // components on the props variance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ComponentType<any>
>(load: () => Promise<{ default: T }>): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const loaded = await load()
      clearReloaded()
      return loaded
    } catch (error) {
      try {
        const loaded = await load()
        clearReloaded()
        return loaded
      } catch {
        if (alreadyReloaded()) throw error

        markReloaded()
        window.location.reload()

        // The reload is asynchronous. Hang the Suspense boundary on a promise
        // that never settles so the user keeps seeing the loading state rather
        // than an error screen that flashes past.
        return new Promise<never>(() => undefined)
      }
    }
  })
}
