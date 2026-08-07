import { useRef, useState } from 'react'
import { uploadImage } from 'lib/cms/uploads'
import { Alert, Button, Field, Input } from '../ui'
import type { FeatureImage } from 'types'

/**
 * Feature image picker. Accepts an upload or a URL typed by hand -- older
 * articles carry URLs that were rewritten during the move to R2, and editors
 * sometimes paste one across from another article.
 */
export default function ImageField({
  value,
  onChange
}: {
  value: FeatureImage
  onChange: (image: FeatureImage) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const src = await uploadImage(file, 'feature')
      onChange({
        ...value,
        src,
        alt: value.alt || file.name.replace(/\.[^.]+$/, '')
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}

      <div className="overflow-hidden rounded-lg ring-1 ring-gray-200">
        {value.src ? (
          <img
            src={value.src}
            alt={value.alt || ''}
            className="h-48 w-full bg-gray-50 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gray-50 text-sm text-gray-400">
            No feature image
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => fileInput.current?.click()} loading={uploading}>
          {value.src ? 'Replace image' : 'Upload image'}
        </Button>
        {value.src && (
          <Button
            variant="ghost"
            onClick={() => onChange({ ...value, src: '' })}
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
          event.target.value = ''
        }}
      />

      <Field
        label="Image path or URL"
        hint="Paste a full URL, or upload above to get one."
      >
        <Input
          value={value.src}
          onChange={(e) => onChange({ ...value, src: e.target.value })}
          placeholder="https://cdn.steamreader.com/feature/my-article-banner.png"
        />
      </Field>

      <Field
        label="Alt text"
        hint="Describes the image for screen readers and search engines."
      >
        <Input
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="A breadboard wired to an LED"
        />
      </Field>

      <Field label="Caption">
        <Input
          value={value.caption ?? ''}
          onChange={(e) => onChange({ ...value, caption: e.target.value })}
          placeholder="Shown beneath the image"
        />
      </Field>
    </div>
  )
}
