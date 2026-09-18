/**
 * Category, group category and tag management.
 */
import { mutate, rpc } from './api'
import type { CategoryRow, GroupCategoryRow, TagRow } from 'types'

export async function listCategories(): Promise<CategoryRow[]> {
  return rpc<CategoryRow[]>('listCategories')
}

export async function saveCategory(
  category: Partial<CategoryRow> & { name: string }
): Promise<void> {
  await mutate('saveCategory', category)
}

/** Its articles become uncategorised rather than being deleted. */
export async function deleteCategory(id: string): Promise<void> {
  await mutate('deleteCategory', id)
}

export async function listTags(): Promise<TagRow[]> {
  return rpc<TagRow[]>('listTags')
}

export async function saveTag(
  tag: Partial<TagRow> & { name: string }
): Promise<void> {
  await mutate('saveTag', tag)
}

export async function deleteTag(id: string): Promise<void> {
  await mutate('deleteTag', id)
}

/**
 * Group categories -- a separate taxonomy from article categories, over
 * groups rather than articles.
 */
export async function listGroupCategories(): Promise<GroupCategoryRow[]> {
  return rpc<GroupCategoryRow[]>('listGroupCategories')
}

export async function saveGroupCategory(
  category: Partial<GroupCategoryRow> & { name: string }
): Promise<void> {
  await mutate('saveGroupCategory', category)
}

/** Its groups become uncategorised rather than being deleted. */
export async function deleteGroupCategory(id: string): Promise<void> {
  await mutate('deleteGroupCategory', id)
}
