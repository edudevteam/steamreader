import { useRef, useState } from 'react'
import { uploadImage } from 'lib/cms/uploads'
import { Alert, Button, Field, Input, Modal } from '../ui'
import {
  MAX_GALLERY_IMAGES,
  normalizeGalleryImage,
  safeImageSrc,
  type GalleryImage
} from './extensions/ImageGallery'

/**
 * Builds the list of pictures a gallery holds: upload a batch, fix the order,
 * write the alt text and captions. The grid the reader sees follows this order
 * exactly, so moving a row moves the thumbnail.
 */
export default function GalleryDialog({
  initial,
  editing,
  onClose,
  onSubmit,
  onRemove
}: {
  initial: GalleryImage[]
  editing: boolean
  onClose: () => void
  onSubmit: (images: GalleryImage[]) => void
  onRemove: () => void
}) {
  const [images, setImages] = useState<GalleryImage[]>(initial)
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const room = MAX_GALLERY_IMAGES - images.length

  const set = <K extends keyof GalleryImage>(
    index: number,
    key: K,
    value: GalleryImage[K]
  ) =>
    setImages((current) =>
      current.map((image, position) =>
        position === index ? { ...image, [key]: value } : image
      )
    )

  const remove = (index: number) =>
    setImages((current) => current.filter((_, position) => position !== index))

  const move = (index: number, step: number) =>
    setImages((current) => {
      const target = index + step
      if (target < 0 || target >= current.length) return current

      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const addUrl = () => {
    const src = safeImageSrc(url)

    if (!src) {
      setError('That does not look like an image URL.')
      return
    }

    setError(null)
    setUrl('')
    setImages((current) => [...current, { src, alt: '', caption: '' }])
  }

  const handleFiles = async (files: File[]) => {
    setUploading(true)
    setError(null)

    // Uploaded one at a time so a rejected file (too big, wrong type) names
    // itself instead of failing the whole batch anonymously.
    for (const file of files.slice(0, room)) {
      try {
        const src = await uploadImage(file)
        setImages((current) => [
          ...current,
          { src, alt: file.name.replace(/\.[^.]+$/, ''), caption: '' }
        ])
      } catch (err) {
        setError(
          `${file.name}: ${
            err instanceof Error ? err.message : 'upload failed'
          }`
        )
      }
    }

    if (files.length > room) {
      setError(`A gallery holds at most ${MAX_GALLERY_IMAGES} images.`)
    }

    setUploading(false)
  }

  const submit = () => onSubmit(images.map(normalizeGalleryImage))

  return (
    <Modal
      open
      title={editing ? 'Edit gallery' : 'Image gallery'}
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
            disabled={images.length === 0}
            onClick={submit}
          >
            {editing ? 'Save gallery' : 'Insert gallery'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => fileInput.current?.click()}
            loading={uploading}
            disabled={room <= 0}
          >
            Upload images
          </Button>
          <p className="text-xs text-gray-500">
            {images.length} of {MAX_GALLERY_IMAGES} · pick several at once
          </p>
        </div>

        <Field label="Or add by URL" hint="An image already hosted elsewhere.">
          <div className="flex gap-2">
            <Input
              value={url}
              spellCheck={false}
              placeholder="https://cdn.steamreader.com/articles/robot-arm.png"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                addUrl()
              }}
            />
            <Button type="button" onClick={addUrl} disabled={room <= 0}>
              Add
            </Button>
          </div>
        </Field>

        {images.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-inset ring-gray-200">
            No images yet. Upload a few — readers click any thumbnail to open
            the slideshow.
          </p>
        ) : (
          <ul className="space-y-3">
            {images.map((image, index) => (
              <li
                key={`${image.src}-${index}`}
                className="flex gap-3 rounded-lg p-3 ring-1 ring-inset ring-gray-200"
              >
                <img
                  src={image.src}
                  alt=""
                  className="size-16 shrink-0 rounded-md bg-gray-100 object-cover"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={image.alt}
                    aria-label={`Alt text for image ${index + 1}`}
                    placeholder="Alt text — describes the image"
                    onChange={(event) => set(index, 'alt', event.target.value)}
                  />
                  <Input
                    value={image.caption}
                    aria-label={`Caption for image ${index + 1}`}
                    placeholder="Caption — shown in the slideshow"
                    onChange={(event) =>
                      set(index, 'caption', event.target.value)
                    }
                  />
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Move image ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="px-2 py-1"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Move image ${index + 1} later`}
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className="px-2 py-1"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => remove(index)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            if (files.length > 0) void handleFiles(files)
            // Reset so picking the same files twice still fires a change.
            event.target.value = ''
          }}
        />
      </div>
    </Modal>
  )
}
