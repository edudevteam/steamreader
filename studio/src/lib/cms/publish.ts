/**
 * Publishing to R2 -- see server/publish.ts for what actually happens.
 */
import { request } from './api'

export interface PublishStatus {
  publishedAt: string | null
  /** R2 keys that would be uploaded, because they are new or changed. */
  upload: string[]
  /** R2 keys that would be deleted, because they are no longer public. */
  remove: string[]
}

export function getPublishStatus(): Promise<PublishStatus> {
  return request<PublishStatus>('/api/publish')
}

export function publishSite(): Promise<PublishStatus> {
  return request<PublishStatus>('/api/publish', { method: 'POST' })
}
