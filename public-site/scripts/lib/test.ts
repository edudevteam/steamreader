/**
 * Tests for the `/images/...` rewrite used by the R2 migration.
 *
 * This is the only part of the migration that edits committed prose in place,
 * so the cases below are the shapes that actually occur in
 * `md-articles/content` and `src/data` -- markdown links, HTML attributes,
 * JSON strings, and the trailing `\` hard line break.
 */
// @ts-expect-error -- plain .mjs helper shared with the migration scripts
import { rewriteReferences } from './rewrite.mjs'

const BASE = 'https://cdn.steamreader.com/static'

const run = (text: string, files = ['banner.png', 'articles/deep.png']) => {
  const unknown = new Set<string>()
  const output = rewriteReferences(text, new Set(files), unknown, BASE)
  return { output, unknown: [...unknown] }
}

describe('rewriteReferences', () => {
  it('rewrites a markdown image', () => {
    expect(run('![Alt](/images/banner.png)').output).toBe(
      `![Alt](${BASE}/banner.png)`
    )
  })

  it('rewrites an HTML src attribute', () => {
    expect(run('<img src="/images/banner.png" />').output).toBe(
      `<img src="${BASE}/banner.png" />`
    )
  })

  it('rewrites a JSON string value', () => {
    expect(run('{"src":"/images/banner.png"}').output).toBe(
      `{"src":"${BASE}/banner.png"}`
    )
  })

  it('rewrites nested paths', () => {
    expect(run('![x](/images/articles/deep.png)').output).toBe(
      `![x](${BASE}/articles/deep.png)`
    )
  })

  it('keeps a markdown hard line break outside the URL', () => {
    // `![x](/images/banner.png)\` -- the trailing backslash is a line break.
    expect(run('![x](/images/banner.png)\\').output).toBe(
      `![x](${BASE}/banner.png)\\`
    )
  })

  it('keeps a sentence-ending period outside the URL', () => {
    expect(run('See /images/banner.png.').output).toBe(`See ${BASE}/banner.png.`)
  })

  it('leaves external URLs that contain /images/ alone', () => {
    const text = 'https://example.com/images/banner.png'
    const { output, unknown } = run(text)
    expect(output).toBe(text)
    expect(unknown).toEqual([])
  })

  it('leaves an already-rewritten URL alone', () => {
    const text = `${BASE}/banner.png`
    expect(run(text).output).toBe(text)
  })

  it('reports and preserves references with no uploaded file', () => {
    const { output, unknown } = run('![x](/images/missing.png)')
    expect(output).toBe('![x](/images/missing.png)')
    expect(unknown).toEqual(['missing.png'])
  })

  it('rewrites every occurrence in one pass', () => {
    const { output } = run('/images/banner.png and /images/articles/deep.png')
    expect(output).toBe(`${BASE}/banner.png and ${BASE}/articles/deep.png`)
  })
})
