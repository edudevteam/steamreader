// ============================================================================
// admin-users -- privileged user management for the STEAM Reader CMS
// ============================================================================
// Creating an auth user, changing an email, or deleting an account all require
// the service_role key, which can never ship to the browser. This function is
// the only place that key lives. Every request is re-authenticated and checked
// against the caller's `admin` role before anything privileged happens.
//
// Deploy:  supabase functions deploy admin-users
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
//          injected by the platform -- no manual secret setup needed.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CMS_ROLES = ['admin', 'editor', 'writer', 'user'] as const
type CmsRole = (typeof CMS_ROLES)[number]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Resolves the caller and refuses anyone who is not an admin. */
async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { error: json({ error: 'Missing authorization header' }, 401) }

  // Validate the JWT by using it, rather than trusting any claim in the body.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error } = await caller.auth.getUser()
  if (error || !user) return { error: json({ error: 'Invalid session' }, 401) }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: json({ error: 'Admin role required' }, 403) }
  }

  return { admin, user }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const guard = await requireAdmin(req)
    if (guard.error) return guard.error
    const { admin, user: callerUser } = guard

    const body = await req.json().catch(() => ({}))
    const action = body.action as string

    switch (action) {
      // ------------------------------------------------------------------
      // list -- profiles joined with auth data (email, last sign-in) that
      // PostgREST deliberately does not expose to the browser.
      // ------------------------------------------------------------------
      case 'list': {
        const { data: profiles, error } = await admin
          .from('profiles')
          .select('id, email, display_name, slug, role, bio, avatar_url, is_active, created_at')
          .order('created_at', { ascending: false })

        if (error) return json({ error: error.message }, 400)

        const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const authById = new Map(authList?.users.map((u) => [u.id, u]) ?? [])

        // Article counts drive the "N articles" column in the users table.
        // Reads `articles` directly rather than `article_list`, so the trash
        // filter every view carries has to be repeated here -- otherwise a
        // user's count keeps counting work they threw away.
        const { data: counts } = await admin
          .from('articles')
          .select('author_id')
          .is('deleted_at', null)
        const countByAuthor = new Map<string, number>()
        for (const row of counts ?? []) {
          if (!row.author_id) continue
          countByAuthor.set(row.author_id, (countByAuthor.get(row.author_id) ?? 0) + 1)
        }

        const users = (profiles ?? []).map((p) => {
          const authUser = authById.get(p.id)
          return {
            ...p,
            email: p.email ?? authUser?.email ?? null,
            email_confirmed: Boolean(authUser?.email_confirmed_at),
            last_sign_in_at: authUser?.last_sign_in_at ?? null,
            article_count: countByAuthor.get(p.id) ?? 0
          }
        })

        return json({ users })
      }

      // ------------------------------------------------------------------
      // create -- provision an account directly, no signup flow required.
      // ------------------------------------------------------------------
      case 'create': {
        const { email, password, display_name, role } = body

        if (!email || !password) return json({ error: 'Email and password are required' }, 400)
        if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
        if (role && !CMS_ROLES.includes(role as CmsRole)) return json({ error: 'Invalid role' }, 400)

        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          // Admin-provisioned accounts skip the confirmation round trip.
          email_confirm: true,
          user_metadata: { display_name }
        })

        if (createError) return json({ error: createError.message }, 400)

        const name = display_name || email.split('@')[0]

        // The profile trigger only fires on self-signup confirmation, so write
        // the row here. Upsert keeps this safe if that ever changes.
        const { error: profileError } = await admin.from('profiles').upsert({
          id: created.user.id,
          email,
          display_name: name,
          slug: slugify(name) || created.user.id.slice(0, 8),
          role: role ?? 'writer',
          is_active: true
        })

        if (profileError) {
          // Do not leave an auth user stranded without a profile.
          await admin.auth.admin.deleteUser(created.user.id)
          return json({ error: profileError.message }, 400)
        }

        return json({ user: { id: created.user.id, email, display_name: name, role: role ?? 'writer' } })
      }

      // ------------------------------------------------------------------
      // update -- role, display name, byline slug, active flag.
      // ------------------------------------------------------------------
      case 'update': {
        const { id, role, display_name, slug, bio, is_active } = body
        if (!id) return json({ error: 'User id is required' }, 400)
        if (role && !CMS_ROLES.includes(role as CmsRole)) return json({ error: 'Invalid role' }, 400)

        // Guard against an admin removing their own last escape hatch.
        if (id === callerUser.id && role && role !== 'admin') {
          const { count } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')

          if ((count ?? 0) <= 1) {
            return json({ error: 'You are the only admin -- promote someone else first' }, 400)
          }
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (role !== undefined) updates.role = role
        if (display_name !== undefined) updates.display_name = display_name
        if (slug !== undefined) updates.slug = slugify(slug)
        if (bio !== undefined) updates.bio = bio
        if (is_active !== undefined) updates.is_active = is_active

        const { error } = await admin.from('profiles').update(updates).eq('id', id)
        if (error) return json({ error: error.message }, 400)

        // A deactivated user should lose access immediately, not at token expiry.
        if (is_active === false) await admin.auth.admin.signOut(id, 'global').catch(() => {})

        return json({ ok: true })
      }

      // ------------------------------------------------------------------
      // delete -- remove the account. Articles survive with a null author.
      // ------------------------------------------------------------------
      case 'delete': {
        const { id, reassign_to } = body
        if (!id) return json({ error: 'User id is required' }, 400)
        if (id === callerUser.id) return json({ error: 'You cannot delete your own account' }, 400)

        if (reassign_to) {
          const { error: reassignError } = await admin
            .from('articles')
            .update({ author_id: reassign_to })
            .eq('author_id', id)

          if (reassignError) return json({ error: reassignError.message }, 400)
        }

        const { error } = await admin.auth.admin.deleteUser(id)
        if (error) return json({ error: error.message }, 400)

        return json({ ok: true })
      }

      // ------------------------------------------------------------------
      // reset_password -- set a new password on behalf of a locked-out user.
      // ------------------------------------------------------------------
      case 'reset_password': {
        const { id, password } = body
        if (!id || !password) return json({ error: 'User id and password are required' }, 400)
        if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)

        const { error } = await admin.auth.admin.updateUserById(id, { password })
        if (error) return json({ error: error.message }, 400)

        return json({ ok: true })
      }

      // ------------------------------------------------------------------
      // invite -- email an invitation instead of setting a password.
      // ------------------------------------------------------------------
      case 'invite': {
        const { email, role, display_name, redirect_to } = body
        if (!email) return json({ error: 'Email is required' }, 400)
        if (role && !CMS_ROLES.includes(role as CmsRole)) return json({ error: 'Invalid role' }, 400)

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirect_to,
          data: { display_name }
        })

        if (error) return json({ error: error.message }, 400)

        const name = display_name || email.split('@')[0]
        await admin.from('profiles').upsert({
          id: data.user.id,
          email,
          display_name: name,
          slug: slugify(name) || data.user.id.slice(0, 8),
          role: role ?? 'writer',
          is_active: true
        })

        return json({ ok: true, user: { id: data.user.id, email } })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    console.error('admin-users error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
