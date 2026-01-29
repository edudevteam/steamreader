import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { marked, Marked } from 'marked'
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
  Author,
  TocItem
} from './types.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const IMAGES_DIR = path.join(process.cwd(), 'content/images')
const OUTPUT_DIR = path.join(process.cwd(), '../public-site/src/data')
const ARTICLES_OUTPUT_DIR = path.join(OUTPUT_DIR, 'articles')
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), '../public-site/public/images')

// Pattern for article files: YYYY-MM-DD-slug.md
const ARTICLE_PATTERN = /^\d{4}-\d{2}-\d{2}-.+\.md$/

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

function generateHeadingId(text: string): string {
  return slugify(text, { lower: true, strict: true })
}

function extractTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const toc: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3
    const text = match[2].trim()
    const id = generateHeadingId(text)
    toc.push({ id, text, level })
  }

  return toc
}

function createHeadingRenderer() {
  return {
    heading({ tokens, depth }: { tokens: { text: string }[]; depth: number }) {
      const text = tokens.map(t => t.text).join('')
      const id = generateHeadingId(text)
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    }
  }
}

async function copyAllImages(): Promise<void> {
  try {
    const files = await fs.readdir(IMAGES_DIR)
    await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true })

    for (const file of files) {
      const srcPath = path.join(IMAGES_DIR, file)
      const destPath = path.join(PUBLIC_IMAGES_DIR, file)
      const stat = await fs.stat(srcPath)

      if (stat.isFile()) {
        await fs.copyFile(srcPath, destPath)
      }
    }

    if (files.length > 0) {
      console.log(chalk.gray(`  Copied ${files.length} images to public/images`))
    }
  } catch {
    // No images directory, that's fine
  }
}

async function processArticle(fileName: string): Promise<ArticleWithRawRefs | null> {
  const articlePath = path.join(CONTENT_DIR, fileName)

  try {
    const fileContent = await fs.readFile(articlePath, 'utf-8')
    const { data, content } = matter(fileContent)
    const frontmatter = data as Frontmatter

    // Generate slug from filename (remove date prefix and .md extension)
    // e.g., "2024-01-15-intro-to-robotics.md" -> "intro-to-robotics"
    const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')

    // Insert excerpt before Lesson Objectives heading if both exist
    const excerpt = frontmatter.excerpt || generateExcerpt(content)
    const lessonObjectivesRegex = /^(## .* ?Lesson Objectives)/m
    const contentWithExcerpt = excerpt && lessonObjectivesRegex.test(content)
      ? content.replace(lessonObjectivesRegex, `${excerpt}\n\n$1`)
      : content

    // Extract table of contents from markdown before processing
    const tableOfContents = extractTableOfContents(contentWithExcerpt)

    // Create a marked instance with custom heading renderer for IDs
    const markedWithIds = new Marked()
    markedWithIds.use({ renderer: createHeadingRenderer() })
    markedWithIds.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(code, { language }).value
        }
      })
    )

    // Process markdown to HTML
    const htmlContent = await markedWithIds.parse(contentWithExcerpt)

    // Calculate reading time
    const stats = readingTime(contentWithExcerpt)

    // Handle feature image - use as-is (local paths like /images/... or external URLs)
    const featureImageSrc = frontmatter.feature_image

    const article: ArticleWithRawRefs = {
      id: frontmatter.id,
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
      tableOfContents,
      _previousSlug: frontmatter.prev || frontmatter.previous,
      _nextSlug: frontmatter.next
    }

    return article
  } catch (error) {
    console.error(chalk.red(`Error processing ${fileName}:`), error)
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

  // Copy all images from shared images directory
  await copyAllImages()

  let files: string[]
  try {
    files = await fs.readdir(CONTENT_DIR)
  } catch {
    console.log(chalk.yellow('No content directory found.'))
    files = []
  }

  // Filter to only article files (YYYY-MM-DD-slug.md format)
  const articleFiles = files.filter(f => ARTICLE_PATTERN.test(f))

  // Process all articles
  const rawArticles: ArticleWithRawRefs[] = []

  for (const file of articleFiles) {
    const article = await processArticle(file)
    if (article && article.status === 'published') {
      rawArticles.push(article)
    }
  }

  // Resolve prev/next references
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

  const files = await fs.readdir(CONTENT_DIR)
  const file = files.find((f) => ARTICLE_PATTERN.test(f) && f.includes(slug))

  if (!file) {
    console.log(chalk.red(`Article not found: ${slug}`))
    return
  }

  // Copy images (in case new ones were added)
  await copyAllImages()

  const article = await processArticle(file)
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
  console.log(chalk.blue('\nArticles:\n'))

  let files: string[]
  try {
    files = await fs.readdir(CONTENT_DIR)
  } catch {
    console.log(chalk.yellow('No content directory found.'))
    return
  }

  // Filter to only article files
  const articleFiles = files.filter(f => ARTICLE_PATTERN.test(f)).sort()

  for (const file of articleFiles) {
    try {
      const articlePath = path.join(CONTENT_DIR, file)
      const fileContent = await fs.readFile(articlePath, 'utf-8')
      const { data } = matter(fileContent)
      const frontmatter = data as Frontmatter

      const status = frontmatter.status === 'draft' ? chalk.yellow('[draft]') : chalk.green('[published]')
      console.log(`  ${status} ${frontmatter.title}`)
      console.log(chalk.gray(`         ${file}`))
    } catch {
      console.log(chalk.red(`  [error] ${file}`))
    }
  }
  console.log()
}

export async function deleteArticle(slug: string): Promise<void> {
  console.log(chalk.blue(`\nDeleting article: ${slug}\n`))

  // Find article file
  const files = await fs.readdir(CONTENT_DIR)
  const file = files.find((f) => ARTICLE_PATTERN.test(f) && f.includes(slug))

  if (!file) {
    console.log(chalk.red(`Article not found: ${slug}`))
    return
  }

  // Delete the markdown file
  await fs.unlink(path.join(CONTENT_DIR, file))
  console.log(chalk.green(`  ✓ Deleted: ${file}`))

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
