/**
 * Category, group category and tag management.
 * Writes are editor/admin only, enforced by RLS.
 */
import { supabase } from 'lib/supabase'
import { generateSlug } from 'lib/markdown'
import { invalidateContent } from 'hooks/useContent'
import type { CategoryRow, GroupCategoryRow, TagRow } from 'types'

export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('category_counts')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    article_count: Number(row.article_count) || 0
  })) as CategoryRow[]
}

export async function saveCategory(
  category: Partial<CategoryRow> & { name: string }
): Promise<void> {
  const payload = {
    slug: category.slug || generateSlug(category.name),
    name: category.name.trim(),
    description: category.description || null,
    color: category.color || null,
    sort_order: category.sort_order ?? 0
  }

  const { error } = category.id
    ? await supabase.from('categories').update(payload).eq('id', category.id)
    : await supabase.from('categories').insert(payload)

  if (error) throw error
  invalidateContent('categories')
}

export async function deleteCategory(id: string): Promise<void> {
  // Articles reference categories with ON DELETE SET NULL, so removing one
  // orphans its articles rather than deleting them.
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
  invalidateContent('categories')
}

export async function listTags(): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from('tag_counts')
    .select('*')
    .order('name')
  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    article_count: Number(row.article_count) || 0
  })) as TagRow[]
}

export async function saveTag(
  tag: Partial<TagRow> & { name: string }
): Promise<void> {
  const payload = {
    slug: tag.slug || generateSlug(tag.name),
    name: tag.name.trim()
  }

  const { error } = tag.id
    ? await supabase.from('tags').update(payload).eq('id', tag.id)
    : await supabase.from('tags').insert(payload)

  if (error) throw error
  invalidateContent('tags')
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
  invalidateContent('tags')
}

/**
 * Group categories -- a separate taxonomy from article categories, over
 * `groups` rather than `articles`. Same shape, same editor/admin-only writes.
 */
export async function listGroupCategories(): Promise<GroupCategoryRow[]> {
  const { data, error } = await supabase
    .from('group_category_counts')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    group_count: Number(row.group_count) || 0
  })) as GroupCategoryRow[]
}

export async function saveGroupCategory(
  category: Partial<GroupCategoryRow> & { name: string }
): Promise<void> {
  const payload = {
    slug: category.slug || generateSlug(category.name),
    name: category.name.trim(),
    description: category.description || null,
    color: category.color || null,
    sort_order: category.sort_order ?? 0
  }

  const { error } = category.id
    ? await supabase
        .from('group_categories')
        .update(payload)
        .eq('id', category.id)
    : await supabase.from('group_categories').insert(payload)

  if (error) throw error
  // Groups carry their category name and slug to the public pages, so a rename
  // here goes stale in the group cache, not in a cache of its own.
  invalidateContent('groups')
}

export async function deleteGroupCategory(id: string): Promise<void> {
  // Groups reference categories with ON DELETE SET NULL, so removing one
  // uncategorises its groups rather than deleting them.
  const { error } = await supabase
    .from('group_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateContent('groups')
}
