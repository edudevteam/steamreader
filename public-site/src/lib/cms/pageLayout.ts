/**
 * Reads and writes for the front page, category page and tag page layouts.
 *
 * Each surface is one `site_settings` row, keyed by `SURFACE_KEYS`. Writes are
 * admin-only, enforced by the "Admins manage site settings" policy rather than
 * by anything here. The read is the same one the public pages make, so what
 * the designer shows is what visitors get -- there is no draft state between
 * the two.
 */
import { supabase } from 'lib/supabase'
import { invalidateContent } from 'hooks/useContent'
import { DEFAULT_LAYOUTS, SURFACE_KEYS, normalizePageLayout } from 'types'
import type { PageLayout, PageSurface } from 'types'

export interface StoredPageLayout {
  layout: PageLayout
  /** False when no row exists yet, i.e. the page is on the built-in default. */
  customised: boolean
  updatedAt: string | null
}

export async function getPageLayout(
  surface: PageSurface
): Promise<StoredPageLayout> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, updated_at')
    .eq('key', SURFACE_KEYS[surface])
    .maybeSingle()

  if (error) throw translateError(error)

  if (!data) {
    return {
      layout: DEFAULT_LAYOUTS[surface],
      customised: false,
      updatedAt: null
    }
  }

  return {
    layout: normalizePageLayout(data.value, surface),
    customised: true,
    updatedAt: data.updated_at ?? null
  }
}

export async function savePageLayout(
  surface: PageSurface,
  layout: PageLayout
): Promise<void> {
  const key = SURFACE_KEYS[surface]

  const { error } = await supabase.from('site_settings').upsert(
    {
      key,
      value: layout,
      updated_by: (await supabase.auth.getUser()).data.user?.id ?? null
    },
    { onConflict: 'key' }
  )

  if (error) throw translateError(error)
  invalidateContent(key)
}

/**
 * Back to the layout the site shipped with.
 *
 * Deletes the row rather than writing the default into it, so "default" stays
 * one definition in `types/pageLayout` -- a reset page picks up any later
 * change to it instead of being frozen at whatever the default was today.
 */
export async function resetPageLayout(surface: PageSurface): Promise<void> {
  const key = SURFACE_KEYS[surface]
  const { error } = await supabase.from('site_settings').delete().eq('key', key)
  if (error) throw translateError(error)
  invalidateContent(key)
}

function translateError(error: { code?: string; message: string }): Error {
  if (error.code === '42501')
    return new Error('Only admins can change page layouts.')
  if (error.code === '42P01')
    return new Error(
      'The site_settings table is missing. Run supabase/fix-09-site-settings.sql.'
    )
  return new Error(error.message)
}
