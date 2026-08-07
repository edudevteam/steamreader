/**
 * Image uploads to R2.
 *
 * Supabase Storage let the browser upload directly because RLS could read the
 * caller's JWT and decide. R2 has no equivalent -- a bucket binding is all-or-
 * nothing -- so this Function is the authorization boundary that RLS used to
 * be. Everything it checks is checked again here regardless of what the client
 * already validated, because the client is reachable and this is not.
 *
 * Runs on POST /api/upload. Returns { url } pointing at the bucket's custom
 * domain, which is what gets written into article content.
 */

// Minimal shapes for the Workers runtime types we touch. Declared locally so
// the functions directory needs no node_modules of its own -- it sits outside
// public-site and Pages compiles it with its own toolchain.
interface R2PutOptions {
  httpMetadata?: { contentType?: string; cacheControl?: string }
  customMetadata?: Record<string, string>
}
interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer, options?: R2PutOptions): Promise<unknown>
  head(key: string): Promise<unknown | null>
}
/**
 * The two SUPABASE values are the same variables the browser bundle uses. The
 * `VITE_` prefix is a Vite build-time convention and means nothing to
 * Cloudflare -- every Pages variable reaches a Function through `env` whatever
 * it is called. Reading them directly rather than keeping unprefixed copies
 * keeps one source of truth, so rotating the anon key cannot leave the Function
 * pointed at a stale value.
 */
interface Env {
  ARTICLE_IMAGES: R2Bucket
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  R2_PUBLIC_BASE_URL: string
}
type PagesFunction<E> = (context: {
  request: Request
  env: E
}) => Response | Promise<Response>

/** Mirrors private.is_contributor() in the Supabase schema. */
const CONTRIBUTOR_ROLES = ['admin', 'editor', 'writer']

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Extension is derived from this map rather than the uploaded filename, so a
 * name like `evil.html` cannot pick its own extension on our origin.
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
}

/** Folders the client may write to. Anything else is a 400, which also makes
 * `..` and absolute paths unrepresentable without a separate traversal check. */
const ALLOWED_FOLDERS = ['articles', 'feature', 'avatars']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })

/** Lowercase, strip accents, collapse everything else to single hyphens. */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Supabase could not be reached or answered with a server error.
 *
 * Kept distinct from "this caller is not allowed", because the two need
 * opposite responses: telling someone to sign in again when Supabase is simply
 * down sends them off to fix a problem that is not theirs.
 */
class UpstreamError extends Error {}

/** fetch that turns a network failure into an UpstreamError rather than an
 * unhandled rejection that surfaces as a raw 500. */
async function fetchUpstream(url: string, headers: Record<string, string>) {
  let response: Response
  try {
    response = await fetch(url, { headers })
  } catch (error) {
    throw new UpstreamError(`Request to Supabase failed: ${String(error)}`)
  }
  // 4xx is a verdict about the caller and is handled by the caller of this
  // function; 5xx is Supabase failing and must not read as "denied".
  if (response.status >= 500) {
    throw new UpstreamError(`Supabase returned ${response.status} for ${url}`)
  }
  return response
}

/**
 * Validates the caller's Supabase session and resolves their CMS role.
 * Returns null when the caller is not a valid, visible user.
 *
 * Two round trips because the JWT carries identity but not role -- role lives
 * in `profiles` and can change after the token was issued. Reading it with the
 * caller's own token (not a service key) means the existing RLS policy stays
 * the single source of truth for who is visible.
 */
async function resolveRole(
  token: string,
  env: Env
): Promise<{ userId: string; role: string } | null> {
  const headers = {
    apikey: env.VITE_SUPABASE_ANON_KEY,
    authorization: `Bearer ${token}`
  }

  const userResponse = await fetchUpstream(`${env.VITE_SUPABASE_URL}/auth/v1/user`, headers)
  if (!userResponse.ok) return null

  const user = (await userResponse.json().catch(() => null)) as { id?: string } | null
  if (!user?.id) return null

  const profileResponse = await fetchUpstream(
    `${env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
    headers
  )
  if (!profileResponse.ok) return null

  const rows = (await profileResponse.json().catch(() => null)) as Array<{
    role?: string
  }> | null
  const role = rows?.[0]?.role
  if (!role) return null

  return { userId: user.id, role }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const missing = (
    [
      'ARTICLE_IMAGES',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'R2_PUBLIC_BASE_URL'
    ] as const
  ).filter((key) => !env[key])
  if (missing.length) {
    // A missing binding is a deploy problem, not a caller problem. Say so in the
    // log and stay vague in the response.
    console.error(`upload: missing bindings/vars: ${missing.join(', ')}`)
    return json({ error: 'Uploads are not configured.' }, 500)
  }

  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sign in to upload images.' }, 401)

  let identity: { userId: string; role: string } | null
  try {
    identity = await resolveRole(token, env)
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error
    console.error(`upload: ${error.message}`)
    return json({ error: 'Could not verify your account. Try again.' }, 503)
  }

  if (!identity) return json({ error: 'Sign in to upload images.' }, 401)
  if (!CONTRIBUTOR_ROLES.includes(identity.role)) {
    return json({ error: 'Your account cannot upload images.' }, 403)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Expected a multipart form upload.' }, 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return json({ error: 'No file was uploaded.' }, 400)

  const folder = String(form.get('folder') ?? 'articles')
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return json({ error: 'Unknown upload folder.' }, 400)
  }

  const extension = ALLOWED_TYPES[file.type]
  if (!extension) {
    return json({ error: 'Images must be PNG, JPEG, WebP, GIF or SVG.' }, 415)
  }
  if (file.size === 0) return json({ error: 'That file is empty.' }, 400)
  if (file.size > MAX_BYTES) {
    return json({ error: 'Images must be 5 MB or smaller.' }, 413)
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image'
  // Timestamp prefix keeps same-named uploads from overwriting each other.
  const key = `${folder}/${Date.now()}-${base}.${extension}`

  try {
    await env.ARTICLE_IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        // Safe to store verbatim: the lookup above already proved file.type is
        // one of the allowlisted keys, so this is never attacker-chosen.
        contentType: file.type,
        // Keys are unique per upload, so these are safe to cache indefinitely.
        cacheControl: 'public, max-age=31536000, immutable'
      },
      customMetadata: { uploadedBy: identity.userId }
    })
  } catch (error) {
    console.error('upload: R2 put failed', error)
    return json({ error: 'Upload failed. Try again.' }, 502)
  }

  return json({ url: `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}` })
}

/**
 * Pages calls the verb-specific handler when one exists, so this only ever sees
 * non-POST requests -- it turns them into a clean 405 instead of a Pages 404.
 */
export const onRequest: PagesFunction<Env> = async () =>
  new Response('Method not allowed', {
    status: 405,
    headers: { allow: 'POST' }
  })
