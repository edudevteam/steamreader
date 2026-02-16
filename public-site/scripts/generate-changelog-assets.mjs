/**
 * Reads src/data/changelog.json and generates:
 *   - public/version.json  (latest entry, for in-app banners & Telegram checks)
 *   - public/rss.xml       (full RSS 2.0 feed for external subscribers)
 *
 * Run: node scripts/generate-changelog-assets.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SITE_URL = process.env.SITE_URL || 'https://steamreader.com'
const SITE_TITLE = 'STEAM Reader'
const SITE_DESCRIPTION =
  'Latest updates and changes to STEAM Reader — a platform for Science, Technology, Engineering, Arts, and Mathematics education.'

// Read changelog
const changelog = JSON.parse(
  readFileSync(resolve(root, 'src/data/changelog.json'), 'utf-8')
)

// --- version.json ---
const latest = changelog[0]
const versionJson = {
  version: latest.version,
  date: latest.date,
  title: latest.title,
  description: latest.description
}
writeFileSync(
  resolve(root, 'public/version.json'),
  JSON.stringify(versionJson, null, 2) + '\n'
)
console.log(`  version.json  →  v${latest.version} (${latest.date})`)

// --- rss.xml ---
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const rssItems = changelog
  .map((entry) => {
    const pubDate = new Date(entry.date + 'T12:00:00Z').toUTCString()
    return `    <item>
      <title>${escapeXml(`v${entry.version} — ${entry.title}`)}</title>
      <description>${escapeXml(entry.description)}</description>
      <link>${SITE_URL}/changelog</link>
      <guid isPermaLink="false">changelog-${entry.version}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`
  })
  .join('\n')

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)} — Changelog</title>
    <link>${SITE_URL}/changelog</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`

writeFileSync(resolve(root, 'public/rss.xml'), rss)
console.log(`  rss.xml       →  ${changelog.length} entries`)
