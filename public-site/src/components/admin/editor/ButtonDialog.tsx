import { useState, type KeyboardEvent } from 'react'
import { classNames } from 'utils'
import { Button, Field, Input, Modal } from '../ui'
import {
  BUTTON_LABEL_STYLE,
  BUTTON_RADIUS_PRESETS,
  DEFAULT_ARTICLE_BUTTON,
  articleButtonStyle,
  normalizeArticleButton,
  safeRadius,
  type ArticleButtonAttributes
} from './extensions/ArticleButton'

/** `<input type="color">` only accepts a six-digit hex. */
const SWATCH = /^#[0-9a-f]{6}$/i

function ColorField({
  label,
  value,
  fallback,
  onChange
}: {
  label: string
  value: string
  fallback: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} hint="Hex, e.g. #673ab7">
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={SWATCH.test(value) ? value : fallback}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
        />
        <Input
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono"
        />
      </div>
    </Field>
  )
}

export default function ButtonDialog({
  initial,
  editing,
  onClose,
  onSubmit,
  onRemove
}: {
  initial: ArticleButtonAttributes
  editing: boolean
  onClose: () => void
  onSubmit: (attributes: ArticleButtonAttributes) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState<ArticleButtonAttributes>(initial)

  const set = <K extends keyof ArticleButtonAttributes>(
    key: K,
    value: ArticleButtonAttributes[K]
  ) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = () => onSubmit(normalizeArticleButton(draft))

  // The dialog lives inside the article editor's layout; Enter should commit
  // the button rather than bubble anywhere unhelpful.
  const onEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    submit()
  }

  const preview = normalizeArticleButton(draft)
  const activeRadius = safeRadius(draft.radius)

  return (
    <Modal
      open
      title={editing ? 'Edit button' : 'Insert button'}
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
          <Button type="button" variant="primary" onClick={submit}>
            {editing ? 'Save button' : 'Insert button'}
          </Button>
        </>
      }
    >
      <div className="space-y-4" onKeyDown={onEnter}>
        <Field label="Label" required>
          <Input
            autoFocus
            value={draft.label}
            placeholder={DEFAULT_ARTICLE_BUTTON.label}
            onChange={(event) => set('label', event.target.value)}
          />
        </Field>

        <Field
          label="Link URL"
          hint="Leave empty for a button that does not link anywhere."
        >
          <Input
            value={draft.href}
            placeholder="https://example.com/signup"
            spellCheck={false}
            onChange={(event) => set('href', event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Background colour"
            value={draft.background}
            fallback={DEFAULT_ARTICLE_BUTTON.background}
            onChange={(value) => set('background', value)}
          />
          <ColorField
            label="Text colour"
            value={draft.color}
            fallback={DEFAULT_ARTICLE_BUTTON.color}
            onChange={(value) => set('color', value)}
          />
        </div>

        <Field label="Corners">
          <div className="flex flex-wrap gap-2">
            {BUTTON_RADIUS_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                aria-pressed={activeRadius === preset.value}
                onClick={() => set('radius', preset.value)}
                className={classNames(
                  'flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-inset transition-colors',
                  activeRadius === preset.value
                    ? 'bg-brand-50 text-brand-700 ring-brand-300'
                    : 'bg-white text-gray-600 ring-gray-300 hover:bg-gray-50'
                )}
              >
                <span
                  aria-hidden
                  className="h-4 w-8 bg-gray-400"
                  style={{ borderRadius: preset.value }}
                />
                {preset.label}
              </button>
            ))}
          </div>
        </Field>

        <div>
          <p className="text-sm font-medium text-gray-900">Preview</p>
          <div className="mt-1.5 flex justify-center rounded-lg bg-gray-50 px-4 py-6 ring-1 ring-inset ring-gray-200">
            {/* Same style strings the published HTML gets, so this is exact. */}
            <span style={cssFromStyleString(articleButtonStyle(preview))}>
              <span style={cssFromStyleString(BUTTON_LABEL_STYLE)}>
                {preview.label}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Turns the node's inline-style string into a React style object. */
function cssFromStyleString(style: string): Record<string, string> {
  return Object.fromEntries(
    style.split(';').map((declaration) => {
      const [property, ...rest] = declaration.split(':')
      const name = property
        .trim()
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
      return [name, rest.join(':').trim()]
    })
  )
}
