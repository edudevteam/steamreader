/**
 * Group reads and writes. A group is cover material, a category, and an
 * ordered list of article ids -- all one entry in studio/content/groups.json.
 *
 * Lessons can be drafts. The publish build drops any lesson that is not live,
 * so a group can be assembled ahead of its articles going public -- which is
 * why `GroupLesson` carries status.
 */
import { mutate, rpc } from './api'
import type { GroupDraft, GroupMembership, GroupRow } from 'types'

export async function listGroups(): Promise<GroupRow[]> {
  return rpc<GroupRow[]>('listGroups')
}

/** Which articles sit in which group, for the article list's group filter. */
export async function listGroupMemberships(): Promise<GroupMembership[]> {
  return rpc<GroupMembership[]>('listGroupMemberships')
}

export async function getGroup(id: string): Promise<GroupDraft | null> {
  return rpc<GroupDraft | null>('getGroup', id)
}

export async function saveGroup(draft: GroupDraft): Promise<string> {
  return mutate<string>('saveGroup', draft)
}

/** Removes the group only; the articles in it are untouched. */
export async function deleteGroup(id: string): Promise<void> {
  await mutate('deleteGroup', id)
}

export async function isGroupSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  return rpc<boolean>('isGroupSlugAvailable', { slug, excludeId })
}
