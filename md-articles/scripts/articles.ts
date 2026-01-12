#!/usr/bin/env tsx
import { Command } from 'commander'
import chalk from 'chalk'
import {
  buildAllArticles,
  buildSingleArticle,
  listArticles,
  deleteArticle
} from './lib/article-processor.js'

const program = new Command()

program
  .name('articles')
  .description('CLI for managing STEAM Reader articles')
  .version('1.0.0')

program
  .command('build')
  .description('Build articles from markdown to JSON')
  .option('-a, --all', 'Build all articles')
  .option('-s, --article <slug>', 'Build a specific article by slug')
  .action(async (options) => {
    try {
      if (options.article) {
        await buildSingleArticle(options.article)
      } else {
        await buildAllArticles()
      }
    } catch (error) {
      console.error(chalk.red('Build failed:'), error)
      process.exit(1)
    }
  })

program
  .command('list')
  .description('List all articles in the content directory')
  .action(async () => {
    try {
      await listArticles()
    } catch (error) {
      console.error(chalk.red('List failed:'), error)
      process.exit(1)
    }
  })

program
  .command('delete <slug>')
  .description('Delete an article by slug')
  .action(async (slug) => {
    try {
      await deleteArticle(slug)
    } catch (error) {
      console.error(chalk.red('Delete failed:'), error)
      process.exit(1)
    }
  })

program.parse()
