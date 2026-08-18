/**
 * Reads and writes for the front page layout.
 *
 * Writes are admin-only, enforced by the "Admins manage site settings" policy
 * rather than by anything here. The read is the same one the public home page
 * makes, so what the designer shows is what visitors get -- there is no draft
 * state between the two.
 */
import { supabase } from 'lib/supabase'
import { invalidateContent } from 'hooks/useContent'
import { DEFAULT_HOME_LAYOUT, normalizeHomeLayout } from 'types'
import type { HomeLayout } from 'types'

const KEY = 'home_layout'

export interface StoredHomeLayout {
  layout: HomeLayout
  /** False when no row exists yet, i.e. the site is on the built-in default. */
  customised: boolean
  updatedAt: string | null
}

export async function getHomeLayout(): Promise<StoredHomeLayout> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, updated_at')
    .eq('key', KEY)
    .maybeSingle()

  if (error) throw translateError(error)

  if (!data) {
    return { layout: DEFAULT_HOME_LAYOUT, customised: false, updatedAt: null }
  }

  return {
    layout: normalizeHomeLayout(data.value),
    customised: true,
    updatedAt: data.updated_at ?? null
  }
}

export async function saveHomeLayout(layout: HomeLayout): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert(
    {
      key: KEY,
      value: layout,
      updated_by: (await supabase.auth.getUser()).data.user?.id ?? null
    },
    { onConflict: 'key' }
  )

  if (error) throw translateError(error)
  invalidateContent(KEY)
}

/**
 * Back to the layout the site shipped with.
 *
 * Deletes the row rather than writing the default into it, so "default" stays
 * one definition in `types/homeLayout` -- a reset site picks up any later
 * change to it instead of being frozen at whatever the default was today.
 */
export async function resetHomeLayout(): Promise<void> {
  const { error } = await supabase.from('site_settings').delete().eq('key', KEY)
  if (error) throw translateError(error)
  invalidateContent(KEY)
}

function translateError(error: { code?: string; message: string }): Error {
  if (error.code === '42501')
    return new Error('Only admins can change the front page.')
  if (error.code === '42P01')
    return new Error(
      'The site_settings table is missing. Run supabase/fix-09-site-settings.sql.'
    )
  return new Error(error.message)
}
