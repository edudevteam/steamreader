export interface Category {
  slug: string
  name: string
  description?: string
  color?: string
}

export interface CategoriesIndex {
  categories: Category[]
}
