/** Image uploads to the public `article-images` Supabase Storage bucket. */
import { supabase } from 'lib/supabase'
import { generateSlug } from 'lib/markdown'

const BUCKET = 'article-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]

export async function uploadImage(
  file: File,
  folder = 'articles'
): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Images must be PNG, JPEG, WebP, GIF or SVG.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Images must be 5 MB or smaller.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const base = generateSlug(file.name.replace(/\.[^.]+$/, '')) || 'image'
  // Timestamp prefix keeps same-named uploads from overwriting each other.
  const path = `${folder}/${Date.now()}-${base}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
