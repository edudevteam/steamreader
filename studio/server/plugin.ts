/**
 * Mounts the Studio's local API on the Vite dev server.
 *
 *   POST /api/rpc/<name>     content reads and writes (see cms.ts)
 *   GET  /api/publish        what a publish would upload and delete
 *   POST /api/publish        publish to R2
 *   POST /api/upload         upload an image to R2, returns its public URL
 *   GET  /preview-data/...   the public JSON, built from local content, so
 *                            previews and the Designer render unpublished work
 *
 * Two guards stand in for a login, because the Studio has none:
 *
 *   * The Host header must be localhost. Vite already binds to 127.0.0.1;
 *     this also stops a DNS-rebinding page from reaching it by name.
 *   * API calls must carry `x-studio: 1`. A browser will not send a custom
 *     header cross-origin without a CORS preflight, and this server answers
 *     no preflights, so another website open in the same browser cannot
 *     drive the Studio.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import slugify from 'slugify'
import { handlers, UserError } from './cms'
import { previewFile, publish, publishStatus } from './publish'
import { createR2Client, loadR2Config, type R2Client } from './r2'

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}
const UPLOAD_FOLDERS = ['articles', 'feature', 'avatars']
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new UserError('Images must be 5 MB or smaller.')
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body ?? null))
}

export function studioApi(env: Record<string, string>): Plugin {
  let r2: R2Client | null = null
  const getR2 = () => (r2 ??= createR2Client(loadR2Config(env)))

  async function upload(req: IncomingMessage) {
    const type = String(req.headers['content-type'] ?? '')
    const extension = IMAGE_TYPES[type]
    if (!extension)
      throw new UserError('Images must be PNG, JPEG, WebP, GIF or SVG.')

    const folder = String(req.headers['x-folder'] ?? 'articles')
    if (!UPLOAD_FOLDERS.includes(folder))
      throw new UserError('Unknown upload folder.')

    const name = decodeURIComponent(
      String(req.headers['x-filename'] ?? 'image')
    )
    const base =
      slugify(name.replace(/\.[^.]+$/, ''), { lower: true, strict: true }) ||
      'image'
    const key = `${folder}/${Date.now()}-${base}.${extension}`

    const client = getR2()
    // Keys are timestamped, so the bytes behind a URL never change.
    await client.put(
      key,
      new Uint8Array(await readBody(req, MAX_UPLOAD_BYTES)),
      type,
      'public, max-age=31536000, immutable'
    )
    return { url: client.publicUrl(key) }
  }

  return {
    name: 'studio-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const isApi = url.pathname.startsWith('/api/')
        const isPreview = url.pathname.startsWith('/preview-data/')
        if (!isApi && !isPreview) return next()

        if (!LOCAL_HOSTS.test(req.headers.host ?? '')) {
          return send(res, 403, {
            error: 'The Studio only answers on localhost.'
          })
        }

        try {
          if (isPreview) {
            const body = previewFile(
              `data/${url.pathname.slice('/preview-data/'.length)}`
            )
            if (body === undefined)
              return send(res, 404, { error: 'Not found' })
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.setHeader('cache-control', 'no-store')
            return res.end(body)
          }

          if (req.headers['x-studio'] !== '1') {
            return send(res, 403, { error: 'Missing x-studio header.' })
          }

          if (url.pathname === '/api/publish') {
            if (req.method === 'GET') return send(res, 200, publishStatus())
            if (req.method === 'POST')
              return send(res, 200, await publish(getR2()))
          }

          if (url.pathname === '/api/upload' && req.method === 'POST') {
            return send(res, 200, await upload(req))
          }

          if (url.pathname.startsWith('/api/rpc/') && req.method === 'POST') {
            const handler = handlers[url.pathname.slice('/api/rpc/'.length)]
            if (!handler) return send(res, 404, { error: 'Unknown action.' })
            const raw = (await readBody(req, 20 * 1024 * 1024)).toString('utf8')
            const args = raw ? JSON.parse(raw) : undefined
            return send(res, 200, await handler(args as never))
          }

          return send(res, 404, { error: 'Not found' })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!(error instanceof UserError)) console.error('[studio]', error)
          return send(res, error instanceof UserError ? 400 : 500, {
            error: message
          })
        }
      })
    }
  }
}
