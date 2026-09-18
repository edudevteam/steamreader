/**
 * Image uploads to R2, through the Studio's local server.
 *
 * The browser never holds the R2 token -- it sends the file to the server,
 * which signs the upload. The checks below are repeated there; this copy only
 * exists to fail fast with a useful message.
 */
import { request } from './api'

export type UploadFolder = 'articles' | 'feature' | 'avatars'

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

  const { url } = await request<{ url?: string }>('/api/upload', {
    method: 'POST',
    headers: {
      'content-type': file.type,
      'x-folder': folder,
      'x-filename': encodeURIComponent(file.name)
    },
    body: file
  })

  if (!url) throw new Error('Upload succeeded but no image URL was returned.')
  return url
}
