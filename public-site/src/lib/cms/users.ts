/**
 * User management client.
 *
 * Everything privileged goes through the `admin-users` Edge Function, which
 * holds the service_role key and re-checks the caller's admin role server-side.
 * The browser never sees that key, and an attacker calling these functions
 * directly gets a 403 from the function rather than a database write.
 */
import { supabase } from 'lib/supabase'
import type { ManagedUser, Profile, Role } from 'types'

async function invokeAdmin<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload }
  })

  if (error) {
    // Edge function errors carry the useful message in the response body.
    const context = (error as { context?: Response }).context
    if (context) {
      const body = await context.json().catch(() => null)
      if (body?.error) throw new Error(body.error)
    }
    throw new Error(error.message)
  }

  if (data?.error) throw new Error(data.error)
  return data as T
}

export async function listUsers(): Promise<ManagedUser[]> {
  const { users } = await invokeAdmin<{ users: ManagedUser[] }>('list')
  return users
}

export interface CreateUserInput {
  email: string
  password: string
  display_name: string
  role: Role
}

export async function createUser(input: CreateUserInput): Promise<void> {
  await invokeAdmin('create', { ...input })
}

export async function inviteUser(input: {
  email: string
  display_name: string
  role: Role
}): Promise<void> {
  await invokeAdmin('invite', {
    ...input,
    redirect_to: `${window.location.origin}/update-password`
  })
}

export async function updateUser(
  id: string,
  updates: Partial<
    Pick<Profile, 'role' | 'display_name' | 'slug' | 'bio' | 'is_active'>
  >
): Promise<void> {
  await invokeAdmin('update', { id, ...updates })
}

export async function deleteUser(
  id: string,
  reassignTo?: string
): Promise<void> {
  await invokeAdmin('delete', { id, reassign_to: reassignTo })
}

export async function resetUserPassword(
  id: string,
  password: string
): Promise<void> {
  await invokeAdmin('reset_password', { id, password })
}

/**
 * Contributor list for the article editor's author picker. Reads `profiles`
 * directly -- RLS already limits this to staff, and it avoids a function call
 * on every editor load.
 */
export async function listContributors(): Promise<
  Pick<Profile, 'id' | 'display_name' | 'slug' | 'role'>[]
> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug, role')
    .in('role', ['admin', 'editor', 'writer'])
    .eq('is_active', true)
    .order('display_name')

  if (error) throw error
  return data ?? []
}
