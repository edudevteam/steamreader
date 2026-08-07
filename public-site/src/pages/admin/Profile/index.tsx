import { useEffect, useState } from 'react'
import { useAuth } from 'context/AuthContext'
import { uploadImage } from 'lib/cms/uploads'
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  RoleBadge,
  SectionHeading,
  Textarea
} from 'components/admin/ui'

const SOCIAL_FIELDS = [
  ['website', 'Website'],
  ['github', 'GitHub'],
  ['twitter', 'Twitter / X'],
  ['linkedin', 'LinkedIn']
] as const

/** The author byline a contributor manages for themselves. */
export default function AdminProfilePage() {
  const { profile, user, role, updateProfile, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [social, setSocial] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setBio(profile.bio ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setSocial(profile.social ?? {})
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)

    // Drop empty social entries so the stored object stays clean.
    const cleanedSocial = Object.fromEntries(
      Object.entries(social).filter(([, value]) => value?.trim())
    )

    const { error: saveError } = await updateProfile({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl.trim() || null,
      social: cleanedSocial
    })

    if (saveError) {
      setError(saveError.message)
    } else {
      setNotice('Profile saved.')
      await refreshProfile()
    }
    setSaving(false)
  }

  const handleAvatar = async (file: File) => {
    setError(null)
    try {
      setAvatarUrl(await uploadImage(file, 'avatars'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My profile</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          {user?.email} <RoleBadge role={role} />
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}

      <Card className="p-6">
        <SectionHeading
          title="Author byline"
          description={
            profile?.slug
              ? `This is what readers see at /author/${profile.slug}`
              : 'This is what readers see on your articles.'
          }
        />

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-600">
                {(displayName || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <label className="cursor-pointer rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleAvatar(file)
                  event.target.value = ''
                }}
              />
            </label>
          </div>

          <Field
            label="Display name"
            hint="Used as the byline on every article you write."
          >
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>

          <Field label="Bio">
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short introduction shown on your author page."
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900">Links</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <Input
                    value={social[key] ?? ''}
                    onChange={(e) =>
                      setSocial({ ...social, [key]: e.target.value })
                    }
                    placeholder="https://"
                  />
                </Field>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end border-t border-gray-200 pt-5">
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save profile
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
