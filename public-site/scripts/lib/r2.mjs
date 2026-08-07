/**
 * Shared R2 access for the one-off migration scripts.
 *
 * The app writes to R2 through a binding, which only exists inside a Worker.
 * These scripts run on a laptop, so they go through R2's S3-compatible API
 * instead -- hence the separate API token. Nothing in the deployed app uses
 * these credentials.
 */
import { AwsClient } from 'aws4fetch'

const REQUIRED = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL'
]

export function loadR2Config(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}\n` +
        'See R2-SETUP.md for where each of these comes from.'
    )
  }

  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    // Trailing slashes here would produce `//` in every rewritten URL.
    publicBaseUrl: env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')
  }
}

export function createR2Client(config) {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto'
  })

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`

  // Each path segment is encoded separately: encodeURIComponent would escape
  // the slashes that give the object its folder structure.
  const objectUrl = (key) =>
    `${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`

  return {
    publicUrl: (key) => `${config.publicBaseUrl}/${key}`,

    async exists(key) {
      const response = await client.fetch(objectUrl(key), { method: 'HEAD' })
      if (response.status === 404) return false
      if (!response.ok) {
        throw new Error(`HEAD ${key} failed: ${response.status}`)
      }
      return true
    },

    async put(key, body, contentType) {
      const response = await client.fetch(objectUrl(key), {
        method: 'PUT',
        body,
        headers: {
          'content-type': contentType || 'application/octet-stream',
          // Migration keys are stable paths rather than the timestamped keys
          // the upload endpoint mints, so this is a plain long cache and not
          // `immutable` -- replacing a file in place stays possible.
          'cache-control': 'public, max-age=31536000'
        }
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`PUT ${key} failed: ${response.status} ${detail}`.trim())
      }
    }
  }
}

/** Content types by extension, matching what the upload endpoint accepts. */
const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  ico: 'image/x-icon'
}

export function contentTypeFor(filename) {
  const extension = filename.split('.').pop()?.toLowerCase()
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}

/**
 * Runs `worker` over `items` with bounded concurrency.
 *
 * Uploads are network-bound, so serial runs are needlessly slow; unbounded
 * Promise.all on a few hundred files is how you get socket errors instead.
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}
