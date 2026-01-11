export interface AuthorRef {
  slug: string
  name: string
}

export interface CategoryRef {
  slug: string
  name: string
}

export interface TagRef {
  slug: string
  name: string
}

export interface FeatureImage {
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
}

export interface ArticleMeta {
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  author: AuthorRef
  publishedAt: string
  updatedAt?: string
  category: CategoryRef
  tags: TagRef[]
  featureImage: FeatureImage
  readingTime: number
  status: 'published' | 'draft'
}

export interface Article extends ArticleMeta {
  content: string
}

export interface ArticlesIndex {
  articles: ArticleMeta[]
  totalCount: number
  lastUpdated: string
}

export interface Category {
  slug: string
  name: string
  description?: string
  color?: string
  articleCount: number
}

export interface Tag {
  slug: string
  name: string
  articleCount: number
}

export interface Author {
  slug: string
  name: string
  bio?: string
  avatar?: string
  articleCount: number
}

export interface Frontmatter {
  title: string
  subtitle?: string
  author: string
  author_slug?: string
  date: string
  updated?: string
  category: string
  tags?: string[]
  feature_image: string
  feature_image_alt?: string
  feature_image_caption?: string
  excerpt?: string
  status?: 'published' | 'draft'
}
