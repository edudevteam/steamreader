/**
 * Publishing: the only moment content leaves this machine.
 *
 * Builds the public files, compares each against what was uploaded last time
 * (content/published.json keeps a hash per key), uploads the ones that
 * changed and deletes the ones that no longer exist -- an article that was
 * unpublished or trashed stops being downloadable, not just unlisted.
 */
import { createHash } from 'node:crypto'
import { buildPublicFiles, DATA_PREFIX } from './build'
import { loadContent, readManifest, writeManifest } from './store'
import type { R2Client } from './r2'

/**
 * Short, so a publish reaches readers within a minute even through
 * Cloudflare's edge cache. The site revalidates on every navigation anyway.
 */
const DATA_CACHE_CONTROL = 'public, max-age=60'

interface Plan {
  bodies: Map<string, string>
  upload: string[]
  remove: string[]
  hashes: Record<string, string>
}

function plan(): Plan {
  const files = buildPublicFiles(loadContent())
  const previous = readManifest().files

  const bodies = new Map<string, string>()
  const hashes: Record<string, string> = {}
  for (const [key, value] of files) {
    const body = JSON.stringify(value)
    bodies.set(key, body)
    hashes[key] = createHash('sha256').update(body).digest('hex')
  }

  return {
    bodies,
    hashes,
    upload: Object.keys(hashes)
      .filter((key) => previous[key] !== hashes[key])
      .sort(),
    // Only ever deletes under data/ -- images are never touched by a publish.
    remove: Object.keys(previous)
      .filter((key) => key.startsWith(DATA_PREFIX) && !(key in hashes))
      .sort()
  }
}

export interface PublishStatus {
  publishedAt: string | null
  upload: string[]
  remove: string[]
}

export function publishStatus(): PublishStatus {
  const { upload, remove } = plan()
  return { publishedAt: readManifest().publishedAt, upload, remove }
}

/** Builds the JSON in memory for the Studio's own previews. */
export function previewFile(key: string): string | undefined {
  const value = buildPublicFiles(loadContent()).get(key)
  return value === undefined ? undefined : JSON.stringify(value)
}

export async function publish(r2: R2Client): Promise<PublishStatus> {
  const { bodies, hashes, upload, remove } = plan()
  const manifest = readManifest()

  // Articles before the index that lists them, so a reader never follows a
  // link to a file that has not landed yet. Deletes go last for the same
  // reason, after the index has stopped pointing at them.
  const order = (key: string) =>
    key.endsWith('/index.json') || key.endsWith('/site.json') ? 1 : 0
  const uploads = [...upload].sort((a, b) => order(a) - order(b))

  // The manifest is saved after every file, so a publish that fails halfway
  // resumes from where it stopped instead of re-uploading everything.
  for (const key of uploads) {
    await r2.put(
      key,
      bodies.get(key)!,
      'application/json; charset=utf-8',
      DATA_CACHE_CONTROL
    )
    manifest.files[key] = hashes[key]
    writeManifest(manifest)
  }
  for (const key of remove) {
    await r2.remove(key)
    delete manifest.files[key]
    writeManifest(manifest)
  }

  manifest.publishedAt = new Date().toISOString()
  writeManifest(manifest)
  return { publishedAt: manifest.publishedAt, upload: [], remove: [] }
}
