import type {
  ArticleStatus,
  CategoryRef,
  FeatureImage,
  TagRef,
  TocItem,
  ValidationBadges
} from './article'

/**
 * Roles, ordered least to most privileged.
 *
 *   user   -- public reader. Votes on articles, no CMS access.
 *   writer -- authors articles. Sees and edits only their own; cannot publish.
 *   editor -- sees and edits every article, publishes, manages taxonomy.
 *   admin  -- everything an editor can do, plus user management.
 */
export type Role = 'user' | 'writer' | 'editor' | 'admin'

export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  writer: 1,
  editor: 2,
  admin: 3
}

export const CMS_ROLES: Role[] = ['writer', 'editor', 'admin']

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Reader',
  writer: 'Writer',
  editor: 'Editor',
  admin: 'Admin'
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  user: 'Can read and vote on published articles. No access to the CMS.',
  writer: 'Can write and edit their own articles, and submit them for review.',
  editor: 'Can edit and publish every article, and manage categories and tags.',
  admin: 'Full access, including creating and managing users.'
}

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
  archived: 'Archived'
}

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  slug: string | null
  bio: string | null
  avatar_url: string | null
  social: Record<string, string> | null
  role: Role
  is_active: boolean
  created_at: string
  updated_at?: string
}

/** A profile enriched by the admin-users function with auth-side fields. */
export interface ManagedUser extends Profile {
  email_confirmed: boolean
  last_sign_in_at: string | null
  article_count: number
}

/** Row shape of the `article_list` / `article_detail` database views. */
export interface ArticleRow {
  id: string
  slug: string
  title: string
  subtitle: string | null
  excerpt: string
  status: ArticleStatus
  published_at: string | null
  updated_at: string
  created_at: string
  reading_time: number
  feature_image: FeatureImage | Record<string, never>
  validation: ValidationBadges | null
  previous_slug: string | null
  next_slug: string | null
  author_id: string | null
  author_slug: string | null
  author_name: string | null
  category_id: string | null
  category_slug: string | null
  category_name: string | null
  tags: TagRef[]
}

export interface ArticleDetailRow extends ArticleRow {
  content_html: string
  content_markdown: string
  toc: TocItem[]
}

/** The editable draft the article editor holds in state. */
export interface ArticleDraft {
  id?: string
  slug: string
  title: string
  subtitle: string
  excerpt: string
  content_markdown: string
  status: ArticleStatus
  published_at: string | null
  author_id: string | null
  category_id: string | null
  tags: TagRef[]
  feature_image: FeatureImage
  previous_slug: string | null
  next_slug: string | null
  validation: ValidationBadges | null
}

export interface CategoryRow extends CategoryRef {
  id: string
  description: string | null
  color: string | null
  sort_order: number
  article_count?: number
}

export interface TagRow extends TagRef {
  id: string
  article_count?: number
}

export function emptyDraft(authorId: string | null): ArticleDraft {
  return {
    slug: '',
    title: '',
    subtitle: '',
    excerpt: '',
    content_markdown: '',
    status: 'draft',
    published_at: null,
    author_id: authorId,
    category_id: null,
    tags: [],
    feature_image: { src: '', alt: '' },
    previous_slug: null,
    next_slug: null,
    validation: null
  }
}
