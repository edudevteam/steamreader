/**
 * Hand-off between the article editor and the preview tab.
 *
 * The preview opens as a real browser tab, so it cannot read the editor's React
 * state. The editor writes a snapshot to localStorage -- not sessionStorage,
 * which browsers only clone into a tab opened by `window.open` and never update
 * again -- and the preview tab reads it and re-reads it on every `storage`
 * event, which is what keeps it live while you keep typing.
 */
import type { FeatureImage } from 'types'

export const PREVIEW_STORAGE_KEY = 'steamreader:article-preview'

/** Named so repeat clicks reuse the same tab instead of piling up new ones. */
export const PREVIEW_WINDOW_NAME = 'steamreader-article-preview'

export const PREVIEW_PATH = '/admin/article-preview'

export interface ArticlePreviewSnapshot {
  title: string
  subtitle: string
  excerpt: string
  markdown: string
  featureImage: FeatureImage
}

export function writeArticlePreview(snapshot: ArticlePreviewSnapshot): void {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Private-mode or quota failures: the preview tab falls back to whatever
    // snapshot it already has, which beats losing the editor to an exception.
  }
}

export function readArticlePreview(): ArticlePreviewSnapshot | null {
  try {
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ArticlePreviewSnapshot) : null
  } catch {
    return null
  }
}
