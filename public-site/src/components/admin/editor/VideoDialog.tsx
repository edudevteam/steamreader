import { useMemo, useState, type KeyboardEvent } from 'react'
import { Button, Field, Input, Modal } from '../ui'
import {
  VIDEO_PROVIDER_LABELS,
  defaultVideoTitle,
  normalizeVideoEmbed,
  parseVideoUrl,
  videoEmbedSrc,
  type VideoEmbedAttributes
} from './extensions/VideoEmbed'

/** `95` -> `1:35`, so the detected start offset reads back the way it was set. */
function formatStart(seconds: number): string {
  const parts = [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60
  ]

  return (seconds >= 3600 ? parts : parts.slice(1))
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, '0')
    )
    .join(':')
}

export default function VideoDialog({
  initialUrl,
  initialTitle,
  editing,
  onClose,
  onSubmit,
  onRemove
}: {
  initialUrl: string
  initialTitle: string
  editing: boolean
  onClose: () => void
  onSubmit: (attributes: VideoEmbedAttributes) => void
  onRemove: () => void
}) {
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState(initialTitle)
  const [touched, setTouched] = useState(false)

  // The URL is the whole input: provider, id, unlisted key and start offset are
  // all read back out of whatever the author pasted.
  const parsed = useMemo(() => parseVideoUrl(url), [url])

  const submit = () => {
    setTouched(true)
    if (!parsed) return
    onSubmit(normalizeVideoEmbed({ ...parsed, title }))
  }

  const onEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  const showError = touched && url.trim() !== '' && !parsed

  return (
    <Modal
      open
      title={editing ? 'Edit video' : 'Embed video'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <Button
              type="button"
              variant="danger"
              onClick={onRemove}
              className="mr-auto"
            >
              Remove
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!parsed}
            onClick={submit}
          >
            {editing ? 'Save video' : 'Embed video'}
          </Button>
        </>
      }
    >
      <div className="space-y-4" onKeyDown={onEnter}>
        <Field
          label="Video URL"
          required
          error={showError ? 'Paste a YouTube or Vimeo link.' : undefined}
          hint="YouTube or Vimeo — watch, share, shorts and embed links all work."
        >
          <Input
            autoFocus
            value={url}
            spellCheck={false}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            onBlur={() => setTouched(true)}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>

        <Field
          label="Title"
          hint="Read out by screen readers. Leave empty for a generic label."
        >
          <Input
            value={title}
            placeholder={defaultVideoTitle(parsed?.provider ?? 'youtube')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        {parsed && (
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-gray-900">Preview</p>
              <p className="text-xs text-gray-500">
                {VIDEO_PROVIDER_LABELS[parsed.provider]} · {parsed.videoId}
                {parsed.start > 0 &&
                  ` · starts at ${formatStart(parsed.start)}`}
              </p>
            </div>
            {/* The same 16:9 frame and src the published article gets. */}
            <div className="mt-1.5 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-inset ring-gray-200">
              <iframe
                key={videoEmbedSrc(parsed)}
                src={videoEmbedSrc(parsed)}
                title={title.trim() || defaultVideoTitle(parsed.provider)}
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
