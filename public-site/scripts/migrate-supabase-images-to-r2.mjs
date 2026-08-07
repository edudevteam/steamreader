/**
 * One-off migration: Supabase Storage `article-images` -> R2.
 *
 * Copies every object across at the same key, then rewrites the stored URLs in
 * the database. Both halves are idempotent, so a failed run can just be run
 * again -- objects already in R2 are skipped, and the URL rewrite is a prefix
 * swap that no longer matches anything once it has been applied.
 *
 * Nothing is deleted from Supabase. Retiring that bucket is a separate,
 * deliberate step once the site has been verified against R2.
 *
 *   node scripts/migrate-supabase-images-to-r2.mjs --dry-run
 *   node scripts/migrate-supabase-images-to-r2.mjs
 */
import { createClient } from '@supabase/supabase-js'
import {
  loadR2Config,
  createR2Client,
  contentTypeFor,
  mapWithConcurrency
} from './lib/r2.mjs'

const BUCKET = 'article-images'
const CONCURRENCY = 8
const dryRun = process.argv.includes('--dry-run')

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'The service role key is required: this rewrites rows across every ' +
      'author, which RLS is designed to prevent.\n' +
      'See R2-SETUP.md.'
  )
  process.exit(1)
}

// Assigned by main(), so a missing-configuration error is reported by its
// catch handler instead of escaping as a top-level stack trace.
let r2Config
let r2

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const base = supabaseUrl.replace(/\/+$/, '')
/**
 * Both prefixes Supabase can serve a public object from. The render endpoint
 * is only used for on-the-fly transforms, but it costs nothing to catch it and
 * a missed URL is a broken image.
 */
const OLD_PREFIXES = [
  `${base}/storage/v1/object/public/${BUCKET}/`,
  `${base}/storage/v1/render/image/public/${BUCKET}/`
]

/** Walks the bucket depth-first. Supabase list() returns one level at a time. */
async function listAllObjects(prefix = '') {
  const found = []
  const pageSize = 100
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: pageSize, offset })

    if (error) throw new Error(`Listing "${prefix}" failed: ${error.message}`)
    if (!data.length) break

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      // Folders come back as placeholder rows with no id or metadata.
      if (entry.id === null) found.push(...(await listAllObjects(path)))
      else found.push({ path, size: entry.metadata?.size ?? 0 })
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return found
}

async function copyObject(object) {
  if (await r2.exists(object.path)) return 'skipped'
  if (dryRun) return 'copied'

  const { data, error } = await supabase.storage.from(BUCKET).download(object.path)
  if (error) throw new Error(`Download ${object.path} failed: ${error.message}`)

  const body = new Uint8Array(await data.arrayBuffer())
  await r2.put(object.path, body, data.type || contentTypeFor(object.path))
  return 'copied'
}

/** Swaps any Supabase storage prefix for the R2 public base URL. */
function rewrite(value) {
  if (typeof value !== 'string') return value
  return OLD_PREFIXES.reduce(
    (text, prefix) => text.split(prefix).join(`${r2Config.publicBaseUrl}/`),
    value
  )
}

/**
 * Rewrites `columns` on every row of `table` whose values mention the old
 * bucket. jsonb columns are handled by round-tripping through JSON, which
 * catches nested keys like feature_image.src without hard-coding the shape.
 */
async function rewriteTable(table, columns) {
  const { data, error } = await supabase.from(table).select(['id', ...columns].join(','))
  if (error) throw new Error(`Reading ${table} failed: ${error.message}`)

  let changed = 0

  for (const row of data ?? []) {
    const patch = {}

    for (const column of columns) {
      const current = row[column]
      if (current === null || current === undefined) continue

      if (typeof current === 'string') {
        const next = rewrite(current)
        if (next !== current) patch[column] = next
      } else {
        // jsonb: rewrite the serialized form, then parse it back.
        const serialized = JSON.stringify(current)
        const next = rewrite(serialized)
        if (next !== serialized) patch[column] = JSON.parse(next)
      }
    }

    if (!Object.keys(patch).length) continue
    changed += 1
    if (dryRun) continue

    const { error: updateError } = await supabase
      .from(table)
      .update(patch)
      .eq('id', row.id)

    if (updateError) {
      throw new Error(`Updating ${table} ${row.id} failed: ${updateError.message}`)
    }
  }

  console.log(`  ${table}: ${changed} row(s) ${dryRun ? 'would change' : 'updated'}`)
  return changed
}

async function main() {
  r2Config = loadR2Config()
  r2 = createR2Client(r2Config)

  console.log(
    `${dryRun ? '[dry run] ' : ''}Migrating ${BUCKET} -> ${r2Config.bucket} ` +
      `(${r2Config.publicBaseUrl})\n`
  )

  console.log('Copying objects...')
  const objects = await listAllObjects()
  console.log(`  found ${objects.length} object(s)`)

  const outcomes = await mapWithConcurrency(objects, CONCURRENCY, async (object) => {
    try {
      const outcome = await copyObject(object)
      console.log(`  ${outcome === 'skipped' ? 'skip' : 'copy'} ${object.path}`)
      return outcome
    } catch (error) {
      console.error(`  FAIL ${object.path}: ${error.message}`)
      return 'failed'
    }
  })

  const failed = outcomes.filter((outcome) => outcome === 'failed').length
  const copied = outcomes.filter((outcome) => outcome === 'copied').length
  const skipped = outcomes.filter((outcome) => outcome === 'skipped').length
  console.log(`  ${copied} copied, ${skipped} already present, ${failed} failed\n`)

  if (failed) {
    // Rewriting URLs now would point rows at objects that are not in R2.
    console.error('Stopping before the URL rewrite because some copies failed.')
    process.exit(1)
  }

  console.log('Rewriting stored URLs...')
  await rewriteTable('articles', ['feature_image', 'content_markdown', 'content_html'])
  await rewriteTable('courses', ['feature_image'])
  await rewriteTable('profiles', ['avatar_url'])

  console.log(
    dryRun
      ? '\n[dry run] Nothing was written. Re-run without --dry-run to apply.'
      : '\nDone. The Supabase bucket was left untouched -- verify the site, then retire it.'
  )
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
