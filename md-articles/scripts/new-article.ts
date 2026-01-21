#!/usr/bin/env tsx
import { createInterface } from 'readline'
import { randomUUID } from 'crypto'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import slugify from 'slugify'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

const generateSlug = (title: string): string => {
  return slugify(title, {
    lower: true,
    strict: true,
    trim: true
  })
}

const getTodayDate = (): string => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createFrontmatter = (options: {
  id: string
  title: string
  subtitle?: string
  author: string
  authorSlug: string
  date: string
  category: string
  tags: string[]
  featureImage: string
  featureImageAlt: string
  excerpt: string
  status: 'published' | 'draft'
}): string => {
  const tagsYaml = options.tags.length > 0
    ? `tags:\n${options.tags.map(t => `  - ${t}`).join('\n')}`
    : 'tags: []'

  return `---
id: "${options.id}"
title: "${options.title}"
subtitle: "${options.subtitle || ''}"
author: "${options.author}"
author_slug: "${options.authorSlug}"
date: "${options.date}"
category: "${options.category}"
${tagsYaml}

feature_image: "${options.featureImage}"
feature_image_alt: "${options.featureImageAlt}"
feature_image_caption: ""
excerpt: "${options.excerpt}"
status: ${options.status}
prev:
next:
---

# ${options.title}

Start writing your article here...
`
}

async function main() {
  console.log(chalk.blue.bold('\n📝 Create New Article\n'))

  // Required: Title
  const title = await question(chalk.cyan('Article title: '))
  if (!title) {
    console.error(chalk.red('Title is required'))
    process.exit(1)
  }

  // Optional: Subtitle
  const subtitle = await question(chalk.cyan('Subtitle (optional): '))

  // Author with default
  const authorInput = await question(chalk.cyan('Author [Ryan Jones]: '))
  const author = authorInput || 'Ryan Jones'
  const authorSlug = generateSlug(author)

  // Category with default
  const categoryInput = await question(chalk.cyan('Category [Tutorial]: '))
  const category = categoryInput || 'Tutorial'

  // Tags (comma-separated)
  const tagsInput = await question(chalk.cyan('Tags (comma-separated, optional): '))
  const tags = tagsInput
    ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    : []

  // Feature image with default
  const featureImageInput = await question(chalk.cyan('Feature image path [/images/articles/placeholder.jpg]: '))
  const featureImage = featureImageInput || '/images/articles/placeholder.jpg'

  // Feature image alt
  const featureImageAlt = await question(chalk.cyan('Feature image alt text: ')) || title

  // Excerpt
  const excerpt = await question(chalk.cyan('Excerpt (short description): ')) || ''

  // Status
  const statusInput = await question(chalk.cyan('Status [draft]: '))
  const status = (statusInput === 'published' ? 'published' : 'draft') as 'published' | 'draft'

  rl.close()

  // Generate values
  const id = randomUUID()
  const date = getTodayDate()
  const slug = generateSlug(title)
  const filename = `${date}-${slug}.md`

  // Create the frontmatter content
  const content = createFrontmatter({
    id,
    title,
    subtitle,
    author,
    authorSlug,
    date,
    category,
    tags,
    featureImage,
    featureImageAlt,
    excerpt,
    status
  })

  // Determine file path
  const contentDir = join(import.meta.dirname, '..', 'content')
  const filePath = join(contentDir, filename)

  // Check if file already exists
  if (existsSync(filePath)) {
    console.error(chalk.red(`\nFile already exists: ${filename}`))
    process.exit(1)
  }

  // Write the file
  writeFileSync(filePath, content, 'utf-8')

  console.log(chalk.green.bold('\n✅ Article created successfully!\n'))
  console.log(chalk.white('  File:'), chalk.yellow(filename))
  console.log(chalk.white('  Slug:'), chalk.yellow(slug))
  console.log(chalk.white('  UUID:'), chalk.yellow(id))
  console.log(chalk.white('  Path:'), chalk.gray(filePath))
  console.log()
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error)
  process.exit(1)
})
