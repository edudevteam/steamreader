/**
 * Reads and writes for the front page, category page and tag page layouts,
 * kept in studio/content/layouts.json and published inside site.json.
 */
import { mutate, rpc } from './api'
import { DEFAULT_LAYOUTS, normalizePageLayout } from 'types'
import type { PageLayout, PageSurface } from 'types'

export interface StoredPageLayout {
  layout: PageLayout
  /** False when nothing is saved, i.e. the page is on the built-in default. */
  customised: boolean
  updatedAt: string | null
}

export async function getPageLayout(
  surface: PageSurface
): Promise<StoredPageLayout> {
  const { stored } = await rpc<{ stored: { savedAt?: string } | null }>(
    'getPageLayout',
    surface
  )

  return stored
    ? {
        layout: normalizePageLayout(stored, surface),
        customised: true,
        updatedAt: stored.savedAt ?? null
      }
    : { layout: DEFAULT_LAYOUTS[surface], customised: false, updatedAt: null }
}

export async function savePageLayout(
  surface: PageSurface,
  layout: PageLayout
): Promise<void> {
  await mutate('savePageLayout', { surface, layout })
}

/**
 * Back to the layout the site shipped with. Removes the saved layout rather
 * than writing the default into it, so "default" stays one definition in
 * `types/pageLayout`.
 */
export async function resetPageLayout(surface: PageSurface): Promise<void> {
  await mutate('resetPageLayout', surface)
}
