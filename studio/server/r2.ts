/**
 * R2 over its S3-compatible API.
 *
 * The Studio runs on your machine, so it cannot use a Worker binding. It signs
 * requests with an R2 API token instead, read from studio/.env. That token
 * never leaves this process: the browser tab talks to the Studio's local
 * server, and only the server talks to R2.
 */
import { AwsClient } from 'aws4fetch'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicBaseUrl: string
}

const REQUIRED = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL'
] as const

export function loadR2Config(
  env: Record<string, string | undefined>
): R2Config {
  const missing = REQUIRED.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(', ')} in studio/.env. See studio/README.md.`
    )
  }

  return {
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    bucket: env.R2_BUCKET!,
    // A trailing slash here would put `//` in every image URL.
    publicBaseUrl: env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')
  }
}

export function createR2Client(config: R2Config) {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto'
  })

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`

  // Each segment is encoded on its own: encodeURIComponent would escape the
  // slashes that give an object its folder structure.
  const objectUrl = (key: string) =>
    `${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`

  async function check(response: Response, what: string) {
    if (response.ok) return
    const detail = await response.text().catch(() => '')
    throw new Error(`${what} failed: ${response.status} ${detail}`.trim())
  }

  return {
    publicUrl: (key: string) => `${config.publicBaseUrl}/${key}`,

    async put(
      key: string,
      body: BodyInit,
      contentType: string,
      cacheControl: string
    ): Promise<void> {
      const response = await client.fetch(objectUrl(key), {
        method: 'PUT',
        body,
        headers: { 'content-type': contentType, 'cache-control': cacheControl }
      })
      await check(response, `PUT ${key}`)
    },

    async remove(key: string): Promise<void> {
      const response = await client.fetch(objectUrl(key), { method: 'DELETE' })
      // Already gone is the outcome we wanted.
      if (response.status !== 404) await check(response, `DELETE ${key}`)
    },

    /** Confirms the token can reach the bucket, without changing anything. */
    async ping(): Promise<void> {
      const response = await client.fetch(`${endpoint}?list-type=2&max-keys=1`)
      await check(response, `LIST ${config.bucket}`)
    }
  }
}

export type R2Client = ReturnType<typeof createR2Client>
