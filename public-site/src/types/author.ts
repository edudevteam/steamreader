export interface Author {
  slug: string
  name: string
  bio?: string
  avatar?: string
  email?: string
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
    website?: string
  }
  articleCount: number
}

export interface AuthorsIndex {
  authors: Author[]
}
