import { useRef, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import { classNames } from 'utils'
import { uploadImage } from 'lib/cms/uploads'
import ButtonDialog from './ButtonDialog'
import {
  DEFAULT_ARTICLE_BUTTON,
  normalizeArticleButton,
  type ArticleButtonAttributes
} from './extensions/ArticleButton'

function ToolButton({
  onClick,
  active,
  title,
  disabled,
  children
}: {
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        'flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-brand-600 text-white'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-300" aria-hidden />
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function EditorToolbar({
  editor,
  onError
}: {
  editor: Editor
  onError: (message: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [buttonDraft, setButtonDraft] = useState<{
    attributes: ArticleButtonAttributes
    editing: boolean
  } | null>(null)

  // Selecting an existing button and hitting the toolbar edits it in place;
  // otherwise a fresh one is inserted at the cursor.
  const openButtonDialog = () => {
    const editing = editor.isActive('articleButton')

    setButtonDraft({
      editing,
      attributes: editing
        ? normalizeArticleButton(editor.getAttributes('articleButton'))
        : { ...DEFAULT_ARTICLE_BUTTON }
    })
  }

  const saveButton = (attributes: ArticleButtonAttributes) => {
    const chain = editor.chain().focus()

    if (buttonDraft?.editing) chain.updateArticleButton(attributes).run()
    else chain.setArticleButton(attributes).run()

    setButtonDraft(null)
  }

  const removeButton = () => {
    editor.chain().focus().unsetArticleButton().run()
    setButtonDraft(null)
  }

  const addLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')

    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleImageFile = async (file: File) => {
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    // Sticky so a page scroll can't push the toolbar out of reach; top-16
    // clears the mobile admin header, which only exists below `lg`.
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-gray-200 bg-gray-50 px-2 py-1.5 lg:top-0">
      <ToolButton
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Icon d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" />
      </ToolButton>
      <ToolButton
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Icon d="M21 10H11a5 5 0 00-5 5v1m15-6l-4-4m4 4l-4 4" />
      </ToolButton>

      <Divider />

      {([2, 3, 4] as const).map((level) => (
        <ToolButton
          key={level}
          title={`Heading ${level}`}
          active={editor.isActive('heading', { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        >
          <span className="font-semibold">H{level}</span>
        </ToolButton>
      ))}
      <ToolButton
        title="Paragraph"
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <span className="font-semibold">P</span>
      </ToolButton>

      <Divider />

      <ToolButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolButton>
      <ToolButton
        title="Inline code"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <span className="font-mono text-xs">{'</>'}</span>
      </ToolButton>

      <Divider />

      <ToolButton
        title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <Icon d="M4 6h.01M4 12h.01M4 18h.01M9 6h11M9 12h11M9 18h11" />
      </ToolButton>
      <ToolButton
        title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <Icon d="M4 6h1v4M4 10h2M6 18H4l2-3H4M9 6h11M9 12h11M9 18h11" />
      </ToolButton>
      <ToolButton
        title="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Icon d="M6 17h3l2-4V7H5v6h3zm9 0h3l2-4V7h-6v6h3z" />
      </ToolButton>
      <ToolButton
        title="Code block"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Icon d="M8 9l-3 3 3 3m8-6l3 3-3 3M14 5l-4 14" />
      </ToolButton>
      <ToolButton
        title="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Icon d="M4 12h16" />
      </ToolButton>

      <Divider />

      <ToolButton
        title="Link"
        active={editor.isActive('link')}
        onClick={addLink}
      >
        <Icon d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
      </ToolButton>
      <ToolButton
        title={
          editor.isActive('articleButton') ? 'Edit button' : 'Insert button'
        }
        active={editor.isActive('articleButton')}
        onClick={openButtonDialog}
      >
        <Icon d="M5 9h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2zM9.5 12h5" />
      </ToolButton>
      <ToolButton
        title="Insert image"
        onClick={() => fileInput.current?.click()}
      >
        <Icon d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </ToolButton>
      <ToolButton
        title="Insert table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Icon d="M3 10h18M3 14h18M10 3v18M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
      </ToolButton>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImageFile(file)
          // Reset so selecting the same file twice still fires a change.
          event.target.value = ''
        }}
      />

      {buttonDraft && (
        <ButtonDialog
          initial={buttonDraft.attributes}
          editing={buttonDraft.editing}
          onClose={() => setButtonDraft(null)}
          onSubmit={saveButton}
          onRemove={removeButton}
        />
      )}
    </div>
  )
}
