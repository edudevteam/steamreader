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

export interface ArticleRef {
  slug: string
  title: string
}

export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

export interface ValidationBadges {
  validatedTutorial?: boolean
  supportedEvidence?: boolean
  communityApproved?: number
}

export interface FeatureImage {
  src: string
  alt: string
  caption?: string
  width?: number
  height?: number
}

export interface ArticleMeta {
  id?: string
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
  previousArticle?: ArticleRef
  nextArticle?: ArticleRef
  validation?: ValidationBadges
}

export interface Article extends ArticleMeta {
  content: string
  tableOfContents: TocItem[]
}

export interface ArticlesIndex {
  articles: ArticleMeta[]
  totalCount: number
  lastUpdated: string
}
