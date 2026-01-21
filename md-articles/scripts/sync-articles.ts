import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import chalk from 'chalk'
import { createClient } from '@supabase/supabase-js'
import type { Frontmatter } from './lib/types.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const ARTICLE_PATTERN = /^\d{4}-\d{2}-\d{2}-.+\.md$/

interface ArticleRecord {
  id: string
  slug: string
  title: string
  status: 'published' | 'draft' | 'archived'
  published_at: string | null
  synced_at: string
}

async function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(chalk.red('\nError: Missing Supabase credentials'))
    console.log(chalk.yellow('\nPlease set the following environment variables:'))
    console.log(chalk.gray('  SUPABASE_URL=https://your-project.supabase.co'))
    console.log(chalk.gray('  SUPABASE_SERVICE_ROLE_KEY=eyJ...'))
    console.log(chalk.yellow('\nYou can add these to a .env file in the md-articles directory.\n'))
    process.exit(1)
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function parseArticleFile(fileName: string): Promise<{
  id: string | undefined
  slug: string
  title: string
  status: 'published' | 'draft'
  publishedAt: string
} | null> {
  const articlePath = path.join(CONTENT_DIR, fileName)

  try {
    const fileContent = await fs.readFile(articlePath, 'utf-8')
    const { data } = matter(fileContent)
    const frontmatter = data as Frontmatter

    // Generate slug from filename (remove date prefix and .md extension)
    const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')

    return {
      id: frontmatter.id,
      slug,
      title: frontmatter.title,
      status: frontmatter.status || 'published',
      publishedAt: frontmatter.date
    }
  } catch (error) {
    console.error(chalk.red(`Error parsing ${fileName}:`), error)
    return null
  }
}

async function syncArticles(options: { dryRun?: boolean; slug?: string } = {}) {
  const { dryRun = false, slug: targetSlug } = options

  console.log(chalk.blue('\nSyncing articles to Supabase...\n'))

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No changes will be made\n'))
  }

  // Get all article files
  let files: string[]
  try {
    files = await fs.readdir(CONTENT_DIR)
  } catch {
    console.log(chalk.yellow('No content directory found.'))
    return
  }

  const articleFiles = files.filter(f => ARTICLE_PATTERN.test(f))

  if (targetSlug) {
    const targetFile = articleFiles.find(f => f.includes(targetSlug))
    if (!targetFile) {
      console.log(chalk.red(`Article not found: ${targetSlug}`))
      return
    }
  }

  // Parse all articles
  const articles: ArticleRecord[] = []
  const skipped: string[] = []
  const missingId: string[] = []

  for (const file of articleFiles) {
    if (targetSlug && !file.includes(targetSlug)) continue

    const parsed = await parseArticleFile(file)
    if (!parsed) {
      skipped.push(file)
      continue
    }

    if (!parsed.id) {
      missingId.push(file)
      console.log(chalk.yellow(`  ⚠ Missing ID: ${parsed.title} (${file})`))
      continue
    }

    if (parsed.status === 'draft') {
      console.log(chalk.gray(`  ○ Draft: ${parsed.title}`))
      continue
    }

    articles.push({
      id: parsed.id,
      slug: parsed.slug,
      title: parsed.title,
      status: parsed.status,
      published_at: parsed.publishedAt,
      synced_at: new Date().toISOString()
    })
  }

  if (missingId.length > 0) {
    console.log(chalk.yellow(`\n⚠ ${missingId.length} article(s) are missing UUIDs and will be skipped.`))
    console.log(chalk.gray('  Run "pnpm new" to create articles with auto-generated UUIDs.\n'))
  }

  if (articles.length === 0) {
    console.log(chalk.yellow('\nNo published articles to sync.'))
    return
  }

  console.log(chalk.blue(`\nFound ${articles.length} published article(s) to sync:\n`))

  for (const article of articles) {
    console.log(chalk.gray(`  • ${article.title} (${article.slug})`))
  }

  if (dryRun) {
    console.log(chalk.yellow('\nDry run complete. No changes made.\n'))
    return
  }

  // Connect to Supabase and upsert
  const supabase = await getSupabaseClient()

  console.log(chalk.blue('\nUpserting to Supabase...'))

  const { data, error } = await supabase
    .from('articles')
    .upsert(articles, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.error(chalk.red('\nError syncing to Supabase:'), error.message)
    if (error.message.includes('relation "articles" does not exist')) {
      console.log(chalk.yellow('\nThe articles table does not exist. Please run the schema.sql file first:'))
      console.log(chalk.gray('  1. Go to your Supabase dashboard'))
      console.log(chalk.gray('  2. Open the SQL Editor'))
      console.log(chalk.gray('  3. Copy and run the contents of supabase/schema.sql\n'))
    }
    process.exit(1)
  }

  console.log(chalk.green(`\n✓ Synced ${articles.length} article(s) to Supabase\n`))

  for (const article of articles) {
    console.log(chalk.green(`  ✓ ${article.title}`))
  }

  console.log()
}

// CLI handling
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const slugIndex = args.indexOf('--slug')
const slug = slugIndex !== -1 ? args[slugIndex + 1] : undefined

syncArticles({ dryRun, slug })
