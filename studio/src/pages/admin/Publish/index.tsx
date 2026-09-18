import { useCallback, useEffect, useState } from 'react'
import {
  getPublishStatus,
  publishSite,
  type PublishStatus
} from 'lib/cms/publish'
import {
  Alert,
  Button,
  Card,
  LoadingBlock,
  SectionHeading
} from 'components/admin/ui'
import { SITE_URL } from 'lib/site'

function FileList({ title, keys }: { title: string; keys: string[] }) {
  if (keys.length === 0) return null
  return (
    <div>
      <p className="text-sm font-medium text-gray-900">
        {title} ({keys.length})
      </p>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
        {keys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The only screen that changes the live site. Everything else in the Studio
 * edits files on this computer; this uploads the published articles and site
 * data to R2, and deletes whatever is no longer public.
 */
export default function AdminPublishPage() {
  const [status, setStatus] = useState<PublishStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await getPublishStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check changes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handlePublish = async () => {
    setPublishing(true)
    setError(null)
    setNotice(null)
    try {
      setStatus(await publishSite())
      setNotice('Published. Readers see the changes within about a minute.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed')
      // A partial publish is recorded file by file, so what is left is
      // exactly what still needs sending.
      void refresh()
    } finally {
      setPublishing(false)
    }
  }

  if (loading && !status) return <LoadingBlock label="Checking changes…" />

  const pending = status ? status.upload.length + status.remove.length : 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Publish site</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sends published articles, groups, authors, categories, tags and page
          layouts to{' '}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {SITE_URL.replace('https://', '')}
          </a>
          . Drafts stay on this computer.
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
          title={pending === 0 ? 'Everything is live' : `${pending} changes`}
          description={
            status?.publishedAt
              ? `Last published ${new Date(
                  status.publishedAt
                ).toLocaleString()}.`
              : 'Nothing has been published from this Studio yet.'
          }
        />

        <div className="space-y-4">
          <FileList title="Upload" keys={status?.upload ?? []} />
          <FileList title="Delete from the site" keys={status?.remove ?? []} />
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button onClick={() => void refresh()} loading={loading}>
            Check again
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            loading={publishing}
            disabled={pending === 0}
          >
            Publish site
          </Button>
        </div>
      </Card>
    </div>
  )
}
