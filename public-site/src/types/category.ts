export interface Category {
  slug: string
  name: string
  description?: string
  color?: string
  articleCount: number
}

export interface CategoriesIndex {
  categories: Category[]
}
