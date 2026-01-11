import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import readingTime from 'reading-time'
import slugify from 'slugify'
import chalk from 'chalk'

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)
import type {
  Article,
  ArticleMeta,
  ArticleRef,
  ArticlesIndex,
  Frontmatter,
  Category,
  Tag,
  Author
} from './types.js'

const CONTENT_DIR = path.join(process.cwd(), 'content/articles')
const OUTPUT_DIR = path.join(process.cwd(), 'src/data')
const ARTICLES_OUTPUT_DIR = path.join(OUTPUT_DIR, 'articles')

// Intermediate type for articles before resolving prev/next references
interface ArticleWithRawRefs extends Omit<Article, 'previousArticle' | 'nextArticle'> {
  _previousSlug?: string
  _nextSlug?: string
}

function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true })
}

function generateExcerpt(content: string, length = 160): string {
  const plainText = content
    .replace(/^#+\s+.*/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  return plainText.length > length ? plainText.slice(0, length).trim() + '...' : plainText
}

async function processArticle(dirName: string): Promise<ArticleWithRawRefs | null> {
  const articlePath = path.join(CONTENT_DIR, dirName, 'index.md')

  try {
    const fileContent = await fs.readFile(articlePath, 'utf-8')
    const { data, content } = matter(fileContent)
    const frontmatter = data as Frontmatter

    // Generate slug from directory name (remove date prefix if present)
    const slug = dirName.replace(/^\d{4}-\d{2}-\d{2}-/, '')

    // Process markdown to HTML
    const htmlContent = await marked.parse(content)

    // Calculate reading time
    const stats = readingTime(content)

    // Handle feature image - check if it's a URL or local path
    let featureImageSrc = frontmatter.feature_image
    if (!featureImageSrc.startsWith('http')) {
      // For local images, we'd normally process them, but for now use a placeholder
      featureImageSrc = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200`
    }

    const article: ArticleWithRawRefs = {
      slug,
      title: frontmatter.title,
      subtitle: frontmatter.subtitle,
      excerpt: frontmatter.excerpt || generateExcerpt(content),
      author: {
        slug: frontmatter.author_slug || generateSlug(frontmatter.author),
        name: frontmatter.author
      },
      publishedAt: frontmatter.date,
      updatedAt: frontmatter.updated,
      category: {
        slug: generateSlug(frontmatter.category),
        name: frontmatter.category
      },
      tags: (frontmatter.tags || []).map((tag: string) => ({
        slug: generateSlug(tag),
        name: tag
      })),
      featureImage: {
        src: featureImageSrc,
        alt: frontmatter.feature_image_alt || frontmatter.title,
        caption: frontmatter.feature_image_caption
      },
      readingTime: Math.ceil(stats.minutes),
      status: frontmatter.status || 'published',
      validation: (frontmatter.validated_tutorial || frontmatter.supported_evidence || frontmatter.community_approved) ? {
        validatedTutorial: frontmatter.validated_tutorial,
        supportedEvidence: frontmatter.supported_evidence,
        communityApproved: frontmatter.community_approved
      } : undefined,
      content: htmlContent,
      _previousSlug: frontmatter.previous,
      _nextSlug: frontmatter.next
    }

    return article
  } catch (error) {
    console.error(chalk.red(`Error processing ${dirName}:`), error)
    return null
  }
}

function resolveArticleRefs(rawArticles: ArticleWithRawRefs[]): Article[] {
  // Create a map of slug -> title for quick lookups
  const slugToTitle = new Map<string, string>()
  for (const article of rawArticles) {
    slugToTitle.set(article.slug, article.title)
  }

  return rawArticles.map((raw) => {
    const { _previousSlug, _nextSlug, ...articleBase } = raw

    const article: Article = { ...articleBase }

    // Resolve previous article reference
    if (_previousSlug) {
      const title = slugToTitle.get(_previousSlug)
      if (title) {
        article.previousArticle = { slug: _previousSlug, title }
      } else {
        console.warn(chalk.yellow(`  Warning: Previous article "${_previousSlug}" not found for "${raw.title}"`))
      }
    }

    // Resolve next article reference
    if (_nextSlug) {
      const title = slugToTitle.get(_nextSlug)
      if (title) {
        article.nextArticle = { slug: _nextSlug, title }
      } else {
        console.warn(chalk.yellow(`  Warning: Next article "${_nextSlug}" not found for "${raw.title}"`))
      }
    }

    return article
  })
}

function extractMeta(article: Article): ArticleMeta {
  const { content, ...meta } = article
  return meta
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

export async function buildAllArticles(): Promise<void> {
  console.log(chalk.blue('\nBuilding all articles...\n'))

  // Ensure output directories exist
  await fs.mkdir(ARTICLES_OUTPUT_DIR, { recursive: true })

  let articleDirs: string[]
  try {
    articleDirs = await fs.readdir(CONTENT_DIR)
  } catch {
    console.log(chalk.yellow('No articles directory found. Creating it...'))
    await fs.mkdir(CONTENT_DIR, { recursive: true })
    articleDirs = []
  }

  // First pass: process all articles with raw refs
  const rawArticles: ArticleWithRawRefs[] = []

  for (const dir of articleDirs) {
    const stat = await fs.stat(path.join(CONTENT_DIR, dir))
    if (!stat.isDirectory()) continue

    const article = await processArticle(dir)
    if (article && article.status === 'published') {
      rawArticles.push(article)
    }
  }

  // Second pass: resolve prev/next references
  const articles = resolveArticleRefs(rawArticles)

  // Write individual article JSON files
  for (const article of articles) {
    await writeJson(path.join(ARTICLES_OUTPUT_DIR, `${article.slug}.json`), article)
    console.log(chalk.green(`  ✓ ${article.title}`))
  }

  // Sort by date descending
  articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  // Write articles index
  const articlesIndex: ArticlesIndex = {
    articles: articles.map(extractMeta),
    totalCount: articles.length,
    lastUpdated: new Date().toISOString()
  }
  await writeJson(path.join(OUTPUT_DIR, 'articles.json'), articlesIndex)

  // Generate and write indices
  await generateIndices(articles)

  console.log(chalk.green(`\n✓ Built ${articles.length} articles\n`))
}

export async function buildSingleArticle(slug: string): Promise<void> {
  console.log(chalk.blue(`\nBuilding article: ${slug}\n`))

  const articleDirs = await fs.readdir(CONTENT_DIR)
  const dir = articleDirs.find((d) => d.includes(slug))

  if (!dir) {
    console.log(chalk.red(`Article not found: ${slug}`))
    return
  }

  const article = await processArticle(dir)
  if (!article) {
    console.log(chalk.red(`Failed to process article: ${slug}`))
    return
  }

  await writeJson(path.join(ARTICLES_OUTPUT_DIR, `${article.slug}.json`), article)
  console.log(chalk.green(`  ✓ ${article.title}`))

  // Rebuild the full index
  await buildAllArticles()
}

async function generateIndices(articles: Article[]): Promise<void> {
  // Categories index
  const categoriesMap = new Map<string, Category>()
  for (const article of articles) {
    const existing = categoriesMap.get(article.category.slug)
    if (existing) {
      existing.articleCount++
    } else {
      categoriesMap.set(article.category.slug, {
        slug: article.category.slug,
        name: article.category.name,
        articleCount: 1
      })
    }
  }
  await writeJson(path.join(OUTPUT_DIR, 'categories.json'), {
    categories: Array.from(categoriesMap.values())
  })

  // Tags index
  const tagsMap = new Map<string, Tag>()
  for (const article of articles) {
    for (const tag of article.tags) {
      const existing = tagsMap.get(tag.slug)
      if (existing) {
        existing.articleCount++
      } else {
        tagsMap.set(tag.slug, {
          slug: tag.slug,
          name: tag.name,
          articleCount: 1
        })
      }
    }
  }
  await writeJson(path.join(OUTPUT_DIR, 'tags.json'), {
    tags: Array.from(tagsMap.values())
  })

  // Authors index
  const authorsMap = new Map<string, Author>()
  for (const article of articles) {
    const existing = authorsMap.get(article.author.slug)
    if (existing) {
      existing.articleCount++
    } else {
      authorsMap.set(article.author.slug, {
        slug: article.author.slug,
        name: article.author.name,
        articleCount: 1
      })
    }
  }
  await writeJson(path.join(OUTPUT_DIR, 'authors.json'), {
    authors: Array.from(authorsMap.values())
  })
}

export async function listArticles(): Promise<void> {
  console.log(chalk.blue('\nArticles in content directory:\n'))

  let articleDirs: string[]
  try {
    articleDirs = await fs.readdir(CONTENT_DIR)
  } catch {
    console.log(chalk.yellow('No articles directory found.'))
    return
  }

  for (const dir of articleDirs) {
    const stat = await fs.stat(path.join(CONTENT_DIR, dir))
    if (!stat.isDirectory()) continue

    try {
      const articlePath = path.join(CONTENT_DIR, dir, 'index.md')
      const fileContent = await fs.readFile(articlePath, 'utf-8')
      const { data } = matter(fileContent)
      const frontmatter = data as Frontmatter

      const status = frontmatter.status === 'draft' ? chalk.yellow('[draft]') : chalk.green('[published]')
      console.log(`  ${status} ${frontmatter.title}`)
      console.log(chalk.gray(`         ${dir}`))
    } catch {
      console.log(chalk.red(`  [error] ${dir}`))
    }
  }
  console.log()
}

export async function deleteArticle(slug: string): Promise<void> {
  console.log(chalk.blue(`\nDeleting article: ${slug}\n`))

  // Find article directory
  const articleDirs = await fs.readdir(CONTENT_DIR)
  const dir = articleDirs.find((d) => d.includes(slug))

  if (!dir) {
    console.log(chalk.red(`Article not found: ${slug}`))
    return
  }

  // Delete source directory
  await fs.rm(path.join(CONTENT_DIR, dir), { recursive: true })
  console.log(chalk.green(`  ✓ Deleted source: ${dir}`))

  // Delete JSON file if it exists
  try {
    await fs.unlink(path.join(ARTICLES_OUTPUT_DIR, `${slug}.json`))
    console.log(chalk.green(`  ✓ Deleted JSON: ${slug}.json`))
  } catch {
    // File may not exist
  }

  // Rebuild indices
  await buildAllArticles()
}
