export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  type: 'feature' | 'content' | 'fix' | 'improvement'
}
