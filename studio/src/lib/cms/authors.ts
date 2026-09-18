/**
 * Authors are bylines, not accounts: a name, a slug for /author/<slug>, and
 * the optional bio, avatar and links the author page shows. Nobody signs in
 * as one.
 */
import { mutate, rpc } from './api'

export interface AuthorRow {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar_url: string | null
  social: Record<string, string> | null
  article_count: number
}

export type AuthorInput = Partial<Omit<AuthorRow, 'article_count'>> & {
  name: string
}

export async function listAuthors(): Promise<AuthorRow[]> {
  return rpc<AuthorRow[]>('listAuthors')
}

export async function saveAuthor(author: AuthorInput): Promise<string> {
  return mutate<string>('saveAuthor', author)
}

/**
 * Takes the author off every byline. With `reassignTo`, their articles are
 * credited to that author instead.
 */
export async function deleteAuthor(
  id: string,
  reassignTo?: string
): Promise<void> {
  await mutate('deleteAuthor', { id, reassignTo })
}
