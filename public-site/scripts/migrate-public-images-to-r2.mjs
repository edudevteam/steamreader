/**
 * One-off migration: committed `public/images` -> R2.
 *
 * These are the images that ship with the repo and are referenced as absolute
 * paths (`/images/foo.png`) from article JSON, the markdown sources, and rows
 * that were imported from them. Uploading them under a `static/` prefix keeps
 * them clearly separate from the timestamped keys the upload endpoint mints.
 *
 * Keys are the original relative paths, so this is idempotent: re-running
 * re-uploads nothing and rewrites nothing that was already rewritten.
 *
 *   node scripts/migrate-public-images-to-r2.mjs --dry-run
 *   node scripts/migrate-public-images-to-r2.mjs
 *   node scripts/migrate-public-images-to-r2.mjs --delete-local
 */
import { readFile, writeFile, readdir, rm, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  loadR2Config,
  createR2Client,
  contentTypeFor,
  mapWithConcurrency
} from './lib/r2.mjs'
import { rewriteReferences as rewriteRefs } from './lib/rewrite.mjs'

const KEY_PREFIX = 'static'
const CONCURRENCY = 8

const dryRun = process.argv.includes('--dry-run')
const deleteLocal = process.argv.includes('--delete-local')

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const publicSite = resolve(scriptDir, '..')
const repoRoot = resolve(publicSite, '..')
const imagesDir = join(publicSite, 'public', 'images')

/** Files whose contents may reference `/images/...`. */
const CONTENT_ROOTS = [
  { dir: join(publicSite, 'src', 'data'), extensions: ['.json'] },
  { dir: join(repoRoot, 'md-articles', 'content'), extensions: ['.md'] }
]

// Assigned by main(), so a missing-configuration error is reported by its
// catch handler instead of escaping as a top-level stack trace.
let r2Config
let r2

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null)
  if (!entries) return []

  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else if (entry.isFile() && entry.name !== '.DS_Store') files.push(path)
  }
  return files
}

const rewriteReferences = (text, uploaded, unknown) =>
  rewriteRefs(text, uploaded, unknown, `${r2Config.publicBaseUrl}/${KEY_PREFIX}`)

async function rewriteRepoFiles(uploaded, unknown) {
  let changedFiles = 0

  for (const root of CONTENT_ROOTS) {
    const files = (await walk(root.dir)).filter((file) =>
      root.extensions.some((extension) => file.endsWith(extension))
    )

    for (const file of files) {
      const original = await readFile(file, 'utf8')
      const next = rewriteReferences(original, uploaded, unknown)
      if (next === original) continue

      changedFiles += 1
      if (!dryRun) await writeFile(file, next)
      console.log(`  ${dryRun ? 'would edit' : 'edited'} ${relative(repoRoot, file)}`)
    }
  }

  console.log(`  ${changedFiles} file(s) ${dryRun ? 'would change' : 'changed'}`)
}

/**
 * The same rewrite against the database, for articles that were imported from
 * these markdown files and still carry `/images/...` in their content.
 */
async function rewriteDatabase(uploaded, unknown) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      '  skipped: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to rewrite ' +
        'imported articles too'
    )
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const targets = [
    { table: 'articles', columns: ['feature_image', 'content_markdown', 'content_html'] },
    { table: 'courses', columns: ['feature_image'] }
  ]

  for (const { table, columns } of targets) {
    const { data, error } = await supabase
      .from(table)
      .select(['id', ...columns].join(','))

    if (error) throw new Error(`Reading ${table} failed: ${error.message}`)

    let changed = 0

    for (const row of data ?? []) {
      const patch = {}

      for (const column of columns) {
        const current = row[column]
        if (current === null || current === undefined) continue

        const isText = typeof current === 'string'
        const serialized = isText ? current : JSON.stringify(current)
        const next = rewriteReferences(serialized, uploaded, unknown)
        if (next === serialized) continue

        patch[column] = isText ? next : JSON.parse(next)
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
  }
}

async function main() {
  r2Config = loadR2Config()
  r2 = createR2Client(r2Config)

  if (!(await stat(imagesDir).catch(() => null))) {
    console.error(`No such directory: ${imagesDir}`)
    process.exit(1)
  }

  console.log(
    `${dryRun ? '[dry run] ' : ''}Migrating public/images -> ` +
      `${r2Config.publicBaseUrl}/${KEY_PREFIX}/\n`
  )

  const files = await walk(imagesDir)
  // Keys use forward slashes regardless of platform.
  const relativePaths = files.map((file) =>
    relative(imagesDir, file).split(sep).join('/')
  )
  console.log(`Uploading ${files.length} file(s)...`)

  const outcomes = await mapWithConcurrency(files, CONCURRENCY, async (file, index) => {
    const path = relativePaths[index]
    const key = `${KEY_PREFIX}/${path}`
    try {
      if (await r2.exists(key)) {
        console.log(`  skip ${path}`)
        return 'skipped'
      }
      if (!dryRun) {
        await r2.put(key, await readFile(file), contentTypeFor(path))
      }
      console.log(`  copy ${path}`)
      return 'copied'
    } catch (error) {
      console.error(`  FAIL ${path}: ${error.message}`)
      return 'failed'
    }
  })

  const failed = outcomes.filter((outcome) => outcome === 'failed').length
  if (failed) {
    console.error(`\n${failed} upload(s) failed. Not rewriting any references.`)
    process.exit(1)
  }

  const uploaded = new Set(relativePaths)
  const unknown = new Set()

  console.log('\nRewriting repo references...')
  await rewriteRepoFiles(uploaded, unknown)

  console.log('\nRewriting database references...')
  await rewriteDatabase(uploaded, unknown)

  if (unknown.size) {
    console.warn(
      `\nLeft ${unknown.size} reference(s) alone -- no matching file in ` +
        `public/images:\n  ${[...unknown].join('\n  ')}`
    )
  }

  // Unresolved references deliberately do not block this. Every one of them
  // points at a path that is *not* in public/images -- that is what made it
  // unresolved -- so it is already broken and deleting the directory cannot
  // make it worse. The warning above is how they get noticed.
  if (deleteLocal && !dryRun) {
    await rm(imagesDir, { recursive: true, force: true })
    console.log('\nRemoved public/images.')
  } else if (deleteLocal) {
    console.log('\nKept public/images: dry run.')
  }

  console.log(
    dryRun
      ? '\n[dry run] Nothing was written. Re-run without --dry-run to apply.'
      : '\nDone.'
  )
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
