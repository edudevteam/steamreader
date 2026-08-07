/**
 * Image uploads to R2, by way of the `/api/upload` Pages Function.
 *
 * The browser cannot write to R2 directly -- a bucket binding has no notion of
 * the calling user -- so uploads go through a Function that verifies the
 * session and re-runs every check below. The validation here is duplicated
 * there on purpose: this copy exists to fail fast and give a useful message,
 * the server copy is the one that actually enforces anything.
 */
import { supabase } from 'lib/supabase'

export type UploadFolder = 'articles' | 'feature' | 'avatars'

const ENDPOINT = '/api/upload'
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
  folder: UploadFolder = 'articles'
): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Images must be PNG, JPEG, WebP, GIF or SVG.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Images must be 5 MB or smaller.')
  }

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) throw new Error('Your session expired. Sign in again.')

  const body = new FormData()
  body.append('file', file)
  body.append('folder', folder)

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${session.access_token}` },
      body
    })
  } catch {
    // Network-level failure, so there is no status to interpret.
    throw new Error('Upload failed. Check your connection and try again.')
  }

  // A misconfigured deploy can return an HTML error page here, so never assume
  // the body parses -- fall back to the status rather than throwing a
  // SyntaxError the caller cannot make sense of.
  const payload = (await response.json().catch(() => null)) as {
    url?: string
    error?: string
  } | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `Upload failed (${response.status}).`)
  }
  if (!payload?.url) {
    throw new Error('Upload succeeded but no image URL was returned.')
  }

  return payload.url
}
