#!/usr/bin/env node
/**
 * One-time migration: the JSON content bundle -> Supabase.
 *
 * Reads what the markdown build pipeline already produced in src/data and
 * writes it into the CMS tables, so the site keeps every existing article,
 * category, tag and course after switching to the database.
 *
 * Markdown source is pulled from ../md-articles/content when a matching file
 * exists, so articles open in the editor as markdown rather than as HTML that
 * has been reverse-engineered.
 *
 * Usage:
 *   node scripts/import-content.mjs --author <email> [--dry-run]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: the import bypasses RLS to set authorship
 * and publish dates, which the anon key cannot do.
 */
import { readFile, readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const here = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(here, '../src/data')
const MARKDOWN_DIR = path.join(here, '../../md-articles/content')

/**
 * Loads public-site/.env, since Node does not do it automatically and the
 * Supabase URL already lives there. Real environment variables win, so the
 * service_role key can still be passed inline without being committed.
 */
function loadEnvFile() {
  const envPath = path.join(here, '../.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue

    const [, key, rawValue = ''] = match
    if (process.env[key] !== undefined) continue

    process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, '$1')
  }
}

loadEnvFile()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const authorEmail = args[args.indexOf('--author') + 1]

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const missing = []
if (!url) missing.push('VITE_SUPABASE_URL (expected in public-site/.env)')
if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (pass it inline)')

if (missing.length > 0) {
  console.error(`\nMissing:\n${missing.map((m) => `  - ${m}`).join('\n')}\n`)
  console.error('Example:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ... \\')
  console.error(`    node scripts/import-content.mjs --author you@example.com --dry-run\n`)
  process.exit(1)
}

// A placeholder left in the command line fails much later, inside Supabase,
// with an error that does not point back here. Accept both key formats: older
// projects issue a JWT ("eyJ..."), newer ones a secret ("sb_secret_...").
if (!/^(eyJ|sb_secret_)/.test(serviceKey)) {
  console.error(
    '\nSUPABASE_SERVICE_ROLE_KEY does not look like a key.\n' +
      'Copy the service_role value from Supabase: Settings -> API.\n'
  )
  process.exit(1)
}
if (!authorEmail || authorEmail.startsWith('--')) {
  console.error('Pass the owning account with --author <email>.')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const readJson = async (name) => JSON.parse(await readFile(path.join(DATA_DIR, name), 'utf-8'))

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Finds the original markdown for a slug, ignoring the YYYY-MM-DD prefix. */
async function loadMarkdown(slug) {
  try {
    const files = await readdir(MARKDOWN_DIR)
    const match = files.find((file) => file.replace(/^\d{4}-\d{2}-\d{2}-/, '') === `${slug}.md`)
    if (!match) return null

    const raw = await readFile(path.join(MARKDOWN_DIR, match), 'utf-8')
    // Strip the frontmatter block; its fields are already in the JSON.
    return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
  } catch {
    return null
  }
}

async function main() {
  console.log(`\n${dryRun ? 'DRY RUN — ' : ''}Importing content into ${url}\n`)

  // ---------------------------------------------------------------- author
  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('id, email, display_name, slug')
    .eq('email', authorEmail)
    .limit(1)

  if (profileError) throw profileError
  if (!profiles?.length) {
    console.error(`No profile found for ${authorEmail}. Create the account first.`)
    process.exit(1)
  }

  const author = profiles[0]
  console.log(`Author: ${author.display_name ?? author.email} (${author.id})`)

  const index = await readJson('articles.json')
  const categoriesData = await readJson('categories.json')
  const tagsData = await readJson('tags.json')

  let coursesData = { courses: [] }
  try {
    coursesData = await readJson('courses.json')
  } catch {
    // Courses are optional.
  }

  // ------------------------------------------------------------ categories
  const categoryIdBySlug = new Map()
  for (const category of categoriesData.categories) {
    if (dryRun) {
      console.log(`  category: ${category.name}`)
      continue
    }
    const { data, error } = await db
      .from('categories')
      .upsert({ slug: category.slug, name: category.name }, { onConflict: 'slug' })
      .select('id, slug')
      .single()

    if (error) throw error
    categoryIdBySlug.set(data.slug, data.id)
  }
  console.log(`Categories: ${categoriesData.categories.length}`)

  // ------------------------------------------------------------------ tags
  const tagIdBySlug = new Map()
  if (!dryRun && tagsData.tags.length > 0) {
    const { data, error } = await db
      .from('tags')
      .upsert(
        tagsData.tags.map((tag) => ({ slug: tag.slug, name: tag.name })),
        { onConflict: 'slug' }
      )
      .select('id, slug')

    if (error) throw error
    for (const tag of data) tagIdBySlug.set(tag.slug, tag.id)
  }
  console.log(`Tags: ${tagsData.tags.length}`)

  // -------------------------------------------------------------- articles
  let imported = 0
  let skippedMarkdown = 0

  for (const meta of index.articles) {
    const full = JSON.parse(
      await readFile(path.join(DATA_DIR, 'articles', `${meta.slug}.json`), 'utf-8')
    )

    const markdown = await loadMarkdown(meta.slug)
    if (!markdown) skippedMarkdown++

    const row = {
      id: full.id,
      slug: full.slug,
      title: full.title,
      subtitle: full.subtitle ?? null,
      excerpt: full.excerpt ?? '',
      // Keep the built HTML verbatim so published pages are byte-identical.
      content_html: full.content ?? '',
      // Without the markdown source the editor falls back to the HTML, which
      // still round-trips, just less cleanly.
      content_markdown: markdown ?? full.content ?? '',
      toc: full.tableOfContents ?? [],
      reading_time: full.readingTime ?? 1,
      feature_image: full.featureImage ?? {},
      validation: full.validation ?? null,
      status: full.status === 'draft' ? 'draft' : 'published',
      published_at: full.publishedAt ? new Date(`${full.publishedAt}T00:00:00Z`).toISOString() : null,
      author_id: author.id,
      created_by: author.id,
      category_id: categoryIdBySlug.get(full.category?.slug) ?? null,
      previous_slug: full.previousArticle?.slug ?? null,
      next_slug: full.nextArticle?.slug ?? null
    }

    if (dryRun) {
      console.log(`  article: ${row.title} (${markdown ? 'markdown' : 'HTML only'})`)
      imported++
      continue
    }

    const { error } = await db.from('articles').upsert(row, { onConflict: 'id' })
    if (error) {
      console.error(`  ✗ ${row.slug}: ${error.message}`)
      continue
    }

    // Replace tag links rather than adding to them, so re-running is safe.
    await db.from('article_tags').delete().eq('article_id', row.id)

    const tagLinks = (full.tags ?? [])
      .map((tag) => tagIdBySlug.get(tag.slug))
      .filter(Boolean)
      // The source JSON contains duplicate tags on some articles.
      .filter((id, position, all) => all.indexOf(id) === position)
      .map((tag_id) => ({ article_id: row.id, tag_id }))

    if (tagLinks.length > 0) {
      const { error: tagError } = await db.from('article_tags').insert(tagLinks)
      if (tagError) console.error(`  ! tags for ${row.slug}: ${tagError.message}`)
    }

    console.log(`  ✓ ${row.title}`)
    imported++
  }

  // --------------------------------------------------------------- courses
  for (const course of coursesData.courses ?? []) {
    if (dryRun) {
      console.log(`  course: ${course.title}`)
      continue
    }

    const { data, error } = await db
      .from('courses')
      .upsert(
        {
          slug: course.slug,
          title: course.title,
          description: course.description ?? '',
          feature_image: course.featureImage ?? {}
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ course ${course.slug}: ${error.message}`)
      continue
    }

    await db.from('course_articles').delete().eq('course_id', data.id)

    const { data: courseArticles } = await db
      .from('articles')
      .select('id, slug')
      .in('slug', course.articles ?? [])

    const idBySlug = new Map((courseArticles ?? []).map((a) => [a.slug, a.id]))
    const links = (course.articles ?? [])
      .map((slug, position) => ({
        course_id: data.id,
        article_id: idBySlug.get(slug),
        position
      }))
      .filter((link) => link.article_id)

    if (links.length > 0) await db.from('course_articles').insert(links)
  }

  // ---------------------------------------------------------- author slug
  // The public author page resolves by slug; align it with the old JSON.
  if (!dryRun) {
    try {
      const authorsData = await readJson('authors.json')
      const existing = authorsData.authors?.[0]
      if (existing?.slug && existing.slug !== author.slug) {
        await db.from('profiles').update({ slug: existing.slug }).eq('id', author.id)
        console.log(`\nAuthor slug set to "${existing.slug}" so /author/${existing.slug} keeps working.`)
      }
    } catch {
      // No authors.json; leave the generated slug in place.
    }
  }

  console.log(`\nDone. ${imported} article(s) processed.`)
  if (skippedMarkdown > 0) {
    console.log(
      `${skippedMarkdown} article(s) had no markdown source and were stored as HTML. ` +
        'They are editable, but the Markdown tab will show converted HTML.'
    )
  }
  console.log(`Courses: ${(coursesData.courses ?? []).length}\n`)
}

main().catch((error) => {
  console.error('\nImport failed:', error.message ?? error)
  process.exit(1)
})
