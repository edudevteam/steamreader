export interface Tag {
  slug: string
  name: string
  articleCount: number
}

export interface TagsIndex {
  tags: Tag[]
}
