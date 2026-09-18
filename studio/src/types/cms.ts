import type {
  ArticleStatus,
  CategoryRef,
  FeatureImage,
  TagRef,
  TocItem,
  ValidationBadges
} from 'types/article'

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
  archived: 'Archived'
}

/**
 * One entry of an article's byline. Exactly one entry per article has
 * `is_primary`, and it always sorts first.
 */
export interface ArticleAuthorRef {
  id: string
  slug: string | null
  name: string | null
  is_primary: boolean
}

/** An article as the Studio lists it, with its byline and taxonomy joined in. */
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
  authors: ArticleAuthorRef[]
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

/**
 * An article in the trash -- deliberately not an `ArticleRow`.
 * The Trash page shows a title, who trashed it and when, and offers Restore or
 * Destroy, so it skips the byline aggregate and the tag rollup.
 *
 * `status` is the status the article will return to on restore, which is why
 * the trash is a timestamp column and not a fifth status.
 */
export interface ArticleTrashRow {
  id: string
  slug: string
  title: string
  status: ArticleStatus
  published_at: string | null
  deleted_at: string
  deleted_by: string | null
  deleted_by_name: string | null
  author_id: string | null
  author_name: string | null
  category_name: string | null
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
  /** Co-authors, in byline order. Never contains `author_id`. */
  co_author_ids: string[]
  category_id: string | null
  tags: TagRef[]
  feature_image: FeatureImage
  previous_slug: string | null
  next_slug: string | null
  validation: ValidationBadges | null
}

/**
 * Row shape of the `groups` table, with its category and lesson count rolled
 * up. `category` is null when the group is uncategorised, or when the category
 * it was in has since been deleted.
 */
export interface GroupRow {
  id: string
  slug: string
  title: string
  description: string
  feature_image: FeatureImage | Record<string, never>
  category_id: string | null
  category: CategoryRef | null
  sort_order: number
  created_at: string
  /** Lessons in the group, published or not. */
  lesson_count: number
}

/**
 * A group reduced to what a membership lookup needs: a name to offer in a
 * filter and the articles it holds. Not a `GroupRow` -- nothing here renders
 * the cover, the category or the count.
 */
export interface GroupMembership {
  id: string
  title: string
  article_ids: string[]
}

/**
 * One lesson in a group, in reading order.
 *
 * `status` and `trashed` ride along because the public group page silently
 * drops anything a reader cannot reach, and the two ways that happens look
 * identical from the editor otherwise: a group assembled ahead of its articles
 * going live, and a lesson somebody has since trashed. Staff can read trashed
 * articles, so nothing else would give the second one away.
 */
export interface GroupLesson {
  article_id: string
  slug: string
  title: string
  status: ArticleStatus
  trashed: boolean
}

/** The editable group the group editor holds in state. */
export interface GroupDraft {
  id?: string
  slug: string
  title: string
  description: string
  feature_image: FeatureImage
  /** Null is allowed but hides the group from every public section. */
  category_id: string | null
  sort_order: number
  /** Article ids in lesson order. Position is the index, not a stored field. */
  lessons: GroupLesson[]
}

/**
 * A new group starts uncategorised rather than defaulting to Courses. The
 * category decides where the group surfaces publicly, which is too big a
 * consequence to pick on the editor's behalf -- the editor prompts instead.
 */
export function emptyGroup(): GroupDraft {
  return {
    slug: '',
    title: '',
    description: '',
    feature_image: { src: '', alt: '' },
    category_id: null,
    sort_order: 0,
    lessons: []
  }
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

/**
 * A group category. Deliberately a separate taxonomy from `CategoryRow`:
 * "Biology" and "Courses" answer different questions and would collide in
 * both admin pickers if they shared a list.
 */
export interface GroupCategoryRow extends CategoryRef {
  id: string
  description: string | null
  color: string | null
  sort_order: number
  group_count?: number
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
    co_author_ids: [],
    category_id: null,
    tags: [],
    feature_image: { src: '', alt: '' },
    previous_slug: null,
    next_slug: null,
    validation: null
  }
}
