import { useCallback, useEffect, useState } from 'react'
import { useAuth } from 'context/AuthContext'
import {
  createUser,
  deleteUser,
  inviteUser,
  listUsers,
  resetUserPassword,
  updateUser
} from 'lib/cms/users'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  Modal,
  RoleBadge,
  Select,
  Textarea
} from 'components/admin/ui'
import { CMS_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from 'types/cms'
import type { ManagedUser, Role } from 'types'

type Dialog = 'none' | 'create' | 'edit' | 'password' | 'delete'

const BLANK_CREATE = {
  email: '',
  password: '',
  display_name: '',
  role: 'writer' as Role
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [dialog, setDialog] = useState<Dialog>('none')
  const [target, setTarget] = useState<ManagedUser | null>(null)
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [inviteInstead, setInviteInstead] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    slug: '',
    bio: '',
    role: 'writer' as Role,
    is_active: true
  })
  const [newPassword, setNewPassword] = useState('')
  const [reassignTo, setReassignTo] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const closeDialog = () => {
    setDialog('none')
    setTarget(null)
    setCreateForm(BLANK_CREATE)
    setNewPassword('')
    setReassignTo('')
    setInviteInstead(false)
  }

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setNotice(successMessage)
      closeDialog()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const openEdit = (person: ManagedUser) => {
    setTarget(person)
    setEditForm({
      display_name: person.display_name ?? '',
      slug: person.slug ?? '',
      bio: person.bio ?? '',
      role: person.role,
      is_active: person.is_active
    })
    setDialog('edit')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create accounts and decide what each person can do.
          </p>
        </div>
        <Button variant="primary" onClick={() => setDialog('create')}>
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New user
        </Button>
      </div>

      {error && dialog === 'none' && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}

      <Card className="mb-6 p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          What each role can do
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {CMS_ROLES.map((role) => (
            <div key={role} className="rounded-lg bg-gray-50 p-3">
              <dt className="mb-1">
                <RoleBadge role={role} />
              </dt>
              <dd className="text-xs text-gray-600">
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        {loading ? (
          <LoadingBlock label="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState
            title="No users yet"
            description="Create the first account to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Articles</th>
                  <th className="px-4 py-3 font-medium">Last sign-in</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {person.display_name || '—'}
                        </span>
                        {!person.is_active && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                            Deactivated
                          </span>
                        )}
                        {person.id === currentUser?.id && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-600">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{person.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={person.role} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {person.article_count}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {person.last_sign_in_at
                        ? new Date(person.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(person)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(person)
                            setDialog('password')
                          }}
                          className="text-xs font-medium text-gray-500 hover:text-gray-900"
                        >
                          Password
                        </button>
                        {person.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setTarget(person)
                              setDialog('delete')
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------------- create */}
      <Modal
        open={dialog === 'create'}
        title="New user"
        onClose={closeDialog}
        footer={
          <>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                run(
                  () =>
                    inviteInstead
                      ? inviteUser({
                          email: createForm.email,
                          display_name: createForm.display_name,
                          role: createForm.role
                        })
                      : createUser(createForm),
                  inviteInstead ? 'Invitation sent.' : 'User created.'
                )
              }
            >
              {inviteInstead ? 'Send invite' : 'Create user'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <div className="space-y-4">
          <Field label="Email" required>
            <Input
              type="email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
              placeholder="writer@example.com"
            />
          </Field>

          <Field
            label="Display name"
            hint="Used as the byline on their articles."
          >
            <Input
              value={createForm.display_name}
              onChange={(e) =>
                setCreateForm({ ...createForm, display_name: e.target.value })
              }
              placeholder="Jamie Rivers"
            />
          </Field>

          <Field label="Role" hint={ROLE_DESCRIPTIONS[createForm.role]}>
            <Select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm({ ...createForm, role: e.target.value as Role })
              }
            >
              {CMS_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={inviteInstead}
              onChange={(e) => setInviteInstead(e.target.checked)}
              className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
            />
            <span>
              Email an invitation instead
              <span className="block text-xs text-gray-500">
                They pick their own password. Leave off to set one now.
              </span>
            </span>
          </label>

          {!inviteInstead && (
            <Field
              label="Temporary password"
              required
              hint="At least 8 characters."
            >
              <Input
                type="text"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Share this with them securely"
              />
            </Field>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------ edit */}
      <Modal
        open={dialog === 'edit'}
        title={`Edit ${target?.display_name || target?.email || 'user'}`}
        onClose={closeDialog}
        footer={
          <>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                run(() => updateUser(target!.id, editForm), 'User updated.')
              }
            >
              Save changes
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <div className="space-y-4">
          <Field label="Display name">
            <Input
              value={editForm.display_name}
              onChange={(e) =>
                setEditForm({ ...editForm, display_name: e.target.value })
              }
            />
          </Field>

          <Field
            label="Author slug"
            hint={`Public page: /author/${editForm.slug || '…'}`}
          >
            <Input
              value={editForm.slug}
              onChange={(e) =>
                setEditForm({ ...editForm, slug: e.target.value })
              }
              className="font-mono"
            />
          </Field>

          <Field label="Bio">
            <Textarea
              rows={3}
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
            />
          </Field>

          <Field label="Role" hint={ROLE_DESCRIPTIONS[editForm.role]}>
            <Select
              value={editForm.role}
              onChange={(e) =>
                setEditForm({ ...editForm, role: e.target.value as Role })
              }
            >
              {(['user', ...CMS_ROLES] as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) =>
                setEditForm({ ...editForm, is_active: e.target.checked })
              }
              className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
            />
            <span>
              Active
              <span className="block text-xs text-gray-500">
                Deactivating signs them out and hides them from author listings.
              </span>
            </span>
          </label>
        </div>
      </Modal>

      {/* -------------------------------------------------------- password */}
      <Modal
        open={dialog === 'password'}
        title="Set a new password"
        onClose={closeDialog}
        footer={
          <>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                run(
                  () => resetUserPassword(target!.id, newPassword),
                  'Password updated.'
                )
              }
            >
              Update password
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <p className="mb-4 text-sm text-gray-600">
          Sets a new password for <strong>{target?.email}</strong>. Share it
          with them securely and ask them to change it.
        </p>
        <Field label="New password" required hint="At least 8 characters.">
          <Input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </Modal>

      {/* ---------------------------------------------------------- delete */}
      <Modal
        open={dialog === 'delete'}
        title="Delete user"
        onClose={closeDialog}
        footer={
          <>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                run(
                  () => deleteUser(target!.id, reassignTo || undefined),
                  'User deleted.'
                )
              }
            >
              Delete user
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <p className="mb-4 text-sm text-gray-600">
          Delete{' '}
          <strong className="text-gray-900">
            {target?.display_name || target?.email}
          </strong>
          ? This cannot be undone.
        </p>

        {(target?.article_count ?? 0) > 0 && (
          <Field
            label={`Reassign their ${target?.article_count} article(s) to`}
            hint="Leave unset to keep the articles with no author."
          >
            <Select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
            >
              <option value="">Leave unassigned</option>
              {users
                .filter(
                  (person) => person.id !== target?.id && person.role !== 'user'
                )
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name || person.email}
                  </option>
                ))}
            </Select>
          </Field>
        )}
      </Modal>
    </div>
  )
}
