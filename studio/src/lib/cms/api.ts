/**
 * Calls into the Studio's local server (server/plugin.ts).
 *
 * The `x-studio` header is what lets the server tell this tab apart from any
 * other website open in the same browser -- see the guard in plugin.ts.
 */
import { invalidateContent } from 'hooks/useContent'

export async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'x-studio': '1', ...init.headers }
    })
  } catch {
    throw new Error(
      'The Studio server is not responding. Is `pnpm dev` running?'
    )
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status}).`)
  }
  return payload as T
}

/** Reads and writes against studio/content, by handler name (server/cms.ts). */
export function rpc<T = void>(name: string, args?: unknown): Promise<T> {
  return request<T>(`/api/rpc/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: args === undefined ? undefined : JSON.stringify(args)
  })
}

/**
 * A write. Previews read the public JSON built from studio/content, and the
 * page hooks cache it for the session, so every change drops that cache.
 */
export async function mutate<T = void>(
  name: string,
  args?: unknown
): Promise<T> {
  const result = await rpc<T>(name, args)
  invalidateContent()
  return result
}
