import type { CategoryRef } from './article'

/**
 * A group as the public pages see it: cover material, the category that
 * decides where it appears, and its article slugs in reading order.
 *
 * `category` is nullable because `groups.category_id` is -- deleting a
 * category sets it null rather than taking the group with it. An uncategorised
 * group still works at its own URL, it just appears in no section.
 */
export interface GroupMeta {
  slug: string
  title: string
  description: string
  featureImage: {
    src: string
    alt: string
  }
  category: CategoryRef | null
  articles: string[]
}

/**
 * The group category the home page renders as courses.
 *
 * A slug rather than an id so nothing has to be looked up first, and so the
 * seeded row stays ordinary data: rename the category and the section keeps
 * working, delete it and the section empties. Groups in any other category are
 * reachable at /group/<slug> but do not appear here.
 */
export const COURSES_CATEGORY_SLUG = 'courses'
