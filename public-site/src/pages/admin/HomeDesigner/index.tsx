/**
 * Front Page Designer.
 *
 * The home page is an ordered list of sections; this screen edits that list
 * and nothing else. Sections move up and down, switch off without being
 * deleted, and each carries its own settings -- which articles a carousel
 * draws, which group category a group shelf draws, what a text block says.
 *
 * The preview beside the list is the real `HomeSections` component with the
 * real content, so there is no mock of the front page to fall out of date. It
 * runs in `preview` mode, where a section with nothing to show says so instead
 * of disappearing.
 *
 * Admin only, matching the "Admins manage site settings" policy. A save is
 * live the moment it lands -- there is no draft -- which is the reason this is
 * not open to editors.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import HomeSections from 'components/home/HomeSections'
import {
  getHomeLayout,
  resetHomeLayout,
  saveHomeLayout
} from 'lib/cms/homeLayout'
import { listGroupCategories } from 'lib/cms/taxonomy'
import {
  useArticles,
  useCategories,
  useGroups,
  useTags
} from 'hooks/useContent'
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  Modal,
  Select,
  Textarea
} from 'components/admin/ui'
import { classNames } from 'utils'
import {
  DEFAULT_HOME_LAYOUT,
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
  SINGLETON_SECTIONS,
  createSection
} from 'types'
import type {
  ArticlesSection,
  GroupCategoryRow,
  GroupsSection,
  HomeLayout,
  HomeSection,
  HomeSectionType,
  SearchSection,
  TextSection
} from 'types'

const SECTION_ORDER: HomeSectionType[] = [
  'articles',
  'groups',
  'quote',
  'text',
  'search',
  'categories'
]

/** The one-line summary each row shows under its type. */
function describe(section: HomeSection): string {
  switch (section.type) {
    case 'search':
      return section.placeholder || 'Search field'
    case 'categories':
      return 'Every article category, as pills'
    case 'quote':
      return 'A random quote from the built-in pool'
    case 'text':
      return section.title || section.body || 'Empty text block'
    case 'articles': {
      const { mode, slug } = section.source
      const filter =
        mode === 'all'
          ? 'all articles'
          : mode === 'tag'
            ? `tagged ${slug || '—'}`
            : mode === 'not-tag'
              ? `not tagged ${slug || '—'}`
              : `in ${slug || '—'}`
      return `${section.limit} ${filter}`
    }
    case 'groups':
      return `${section.limit} from ${section.categorySlug ?? 'every category'}`
  }
}

// -------------------------------------------------------------- row actions

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30',
        danger
          ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <span className="sr-only">{label}</span>
      <svg
        className="size-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        {children}
      </svg>
    </button>
  )
}

// ------------------------------------------------------------ per-type form

interface SettingsProps {
  section: HomeSection
  onChange: (patch: Partial<HomeSection>) => void
  tags: { slug: string; name: string }[]
  categories: { slug: string; name: string }[]
  groupCategories: GroupCategoryRow[]
}

function ArticlesSettings({
  section,
  onChange,
  tags,
  categories
}: SettingsProps & { section: ArticlesSection }) {
  const { mode, slug } = section.source
  const options = mode === 'category' ? categories : tags

  return (
    <>
      <Field label="Heading">
        <Input
          value={section.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </Field>

      <Field label="Subheading">
        <Input
          value={section.subtitle}
          onChange={(event) => onChange({ subtitle: event.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Show">
          <Select
            value={mode}
            onChange={(event) =>
              onChange({
                source: {
                  mode: event.target.value as ArticlesSection['source']['mode'],
                  slug: ''
                }
              })
            }
          >
            <option value="all">All articles</option>
            <option value="tag">Articles with a tag</option>
            <option value="not-tag">Articles without a tag</option>
            <option value="category">Articles in a category</option>
          </Select>
        </Field>

        {mode !== 'all' && (
          <Field label={mode === 'category' ? 'Category' : 'Tag'}>
            <Select
              value={slug}
              onChange={(event) =>
                onChange({ source: { mode, slug: event.target.value } })
              }
            >
              <option value="">Choose one…</option>
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="How many" hint="Cards this section holds in total.">
          <Input
            type="number"
            min={1}
            max={48}
            value={section.limit}
            onChange={(event) =>
              onChange({ limit: Number(event.target.value) || 1 })
            }
          />
        </Field>

        <Field label="Per page" hint="Cards visible before the arrows page on.">
          <Input
            type="number"
            min={1}
            max={6}
            value={section.perPage}
            onChange={(event) =>
              onChange({ perPage: Number(event.target.value) || 1 })
            }
          />
        </Field>
      </div>

      <Field label="Card style">
        <Select
          value={section.variant}
          onChange={(event) =>
            onChange({
              variant: event.target.value as ArticlesSection['variant']
            })
          }
        >
          <option value="default">Plain</option>
          <option value="tutorial">Highlighted</option>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="“View all” link" hint="Leave empty to hide the link.">
          <Input
            value={section.viewAllLink}
            placeholder="/latest"
            onChange={(event) => onChange({ viewAllLink: event.target.value })}
          />
        </Field>

        <Field label="“View all” text">
          <Input
            value={section.viewAllText}
            onChange={(event) => onChange({ viewAllText: event.target.value })}
          />
        </Field>
      </div>
    </>
  )
}

function GroupsSettings({
  section,
  onChange,
  groupCategories
}: SettingsProps & { section: GroupsSection }) {
  return (
    <>
      <Field label="Heading">
        <Input
          value={section.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </Field>

      <Field label="Subheading">
        <Input
          value={section.subtitle}
          onChange={(event) => onChange({ subtitle: event.target.value })}
        />
      </Field>

      <Field
        label="Group category"
        hint="Manage these under Groups → Categories."
      >
        <Select
          value={section.categorySlug ?? ''}
          onChange={(event) =>
            onChange({ categorySlug: event.target.value || null })
          }
        >
          <option value="">Every group</option>
          {groupCategories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Card badge"
        hint="The word on each card. Empty uses the category name."
      >
        <Input
          value={section.badge}
          placeholder="Course"
          onChange={(event) => onChange({ badge: event.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="How many">
          <Input
            type="number"
            min={1}
            max={48}
            value={section.limit}
            onChange={(event) =>
              onChange({ limit: Number(event.target.value) || 1 })
            }
          />
        </Field>

        <Field label="Per page">
          <Input
            type="number"
            min={1}
            max={6}
            value={section.perPage}
            onChange={(event) =>
              onChange({ perPage: Number(event.target.value) || 1 })
            }
          />
        </Field>
      </div>
    </>
  )
}

function SectionSettings(props: SettingsProps) {
  const { section, onChange } = props

  switch (section.type) {
    case 'search':
      return (
        <Field label="Placeholder">
          <Input
            value={(section as SearchSection).placeholder}
            onChange={(event) => onChange({ placeholder: event.target.value })}
          />
        </Field>
      )

    case 'categories':
    case 'quote':
      return (
        <p className="text-sm text-gray-500">
          {SECTION_DESCRIPTIONS[section.type]} Nothing to configure — move it
          where you want it.
        </p>
      )

    case 'text':
      return (
        <>
          <Field label="Heading">
            <Input
              value={(section as TextSection).title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </Field>
          <Field label="Body">
            <Textarea
              rows={4}
              value={(section as TextSection).body}
              onChange={(event) => onChange({ body: event.target.value })}
            />
          </Field>
          <Field label="Alignment">
            <Select
              value={(section as TextSection).align}
              onChange={(event) =>
                onChange({ align: event.target.value as TextSection['align'] })
              }
            >
              <option value="center">Centred</option>
              <option value="left">Left</option>
            </Select>
          </Field>
        </>
      )

    case 'articles':
      return <ArticlesSettings {...props} section={section} />

    case 'groups':
      return <GroupsSettings {...props} section={section} />
  }
}

// ------------------------------------------------------------------- screen

export default function HomeDesignerPage() {
  const [layout, setLayout] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT)
  const [saved, setSaved] = useState<string>('')
  const [customised, setCustomised] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [groupCategories, setGroupCategories] = useState<GroupCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: articles } = useArticles()
  const { data: categories } = useCategories()
  const { data: groups } = useGroups()
  const { data: tags } = useTags()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [stored, nextGroupCategories] = await Promise.all([
        getHomeLayout(),
        listGroupCategories()
      ])
      setLayout(stored.layout)
      setSaved(JSON.stringify(stored.layout))
      setCustomised(stored.customised)
      setUpdatedAt(stored.updatedAt)
      setGroupCategories(nextGroupCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the layout')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Compared as JSON rather than by reference: every edit rebuilds the object,
  // so identity would call an undone change unsaved.
  const dirty = useMemo(() => JSON.stringify(layout) !== saved, [layout, saved])

  const update = (next: HomeSection[]) => {
    setNotice(null)
    setLayout({ version: 1, sections: next })
  }

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= layout.sections.length) return
    const next = [...layout.sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  const patch = (id: string, changes: Partial<HomeSection>) =>
    update(
      layout.sections.map((section) =>
        section.id === id
          ? ({ ...section, ...changes } as HomeSection)
          : section
      )
    )

  const remove = (id: string) =>
    update(layout.sections.filter((section) => section.id !== id))

  const add = (type: HomeSectionType) => {
    const section = createSection(type)
    update([...layout.sections, section])
    setOpenId(section.id)
    setAdding(false)
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveHomeLayout(layout)
      setSaved(JSON.stringify(layout))
      setCustomised(true)
      setUpdatedAt(new Date().toISOString())
      setNotice('Front page saved. It is live now.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    setBusy(true)
    setError(null)
    try {
      await resetHomeLayout()
      setConfirmReset(false)
      await refresh()
      setNotice('Front page reset to the original layout.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset')
    } finally {
      setBusy(false)
    }
  }

  // A second search bar or pill row is never what someone meant.
  const availableTypes = SECTION_ORDER.filter(
    (type) =>
      !SINGLETON_SECTIONS.includes(type) ||
      !layout.sections.some((section) => section.type === type)
  )

  if (loading) return <LoadingBlock label="Loading the front page…" />

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front page</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The home page top to bottom. Reorder the sections, switch one off,
            or add another. Saving publishes straight to the live site — there
            is no draft.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {customised
              ? `Custom layout${
                  updatedAt
                    ? `, last saved ${new Date(updatedAt).toLocaleString()}`
                    : ''
                }`
              : 'Using the original built-in layout'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={busy || !customised}
            onClick={() => setConfirmReset(true)}
          >
            Reset to original
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!dirty}
            onClick={handleSave}
          >
            {dirty ? 'Save & publish' : 'Saved'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {notice && !dirty && (
        <div className="mb-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}
      {dirty && (
        <div className="mb-4">
          <Alert kind="info">
            Unsaved changes. The preview below is what visitors will see once
            you save.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Section list */}
        <div>
          <div className="space-y-2">
            {layout.sections.map((section, index) => {
              const open = openId === section.id

              return (
                <Card key={section.id} className="overflow-hidden">
                  <div
                    className={classNames(
                      'flex items-center gap-2 px-3 py-2.5',
                      section.enabled ? '' : 'bg-gray-50'
                    )}
                  >
                    <div className="flex flex-col">
                      <IconButton
                        label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 15l7-7 7 7"
                        />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={index === layout.sections.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </IconButton>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : section.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={classNames(
                            'truncate text-sm font-medium',
                            section.enabled
                              ? 'text-gray-900'
                              : 'text-gray-400 line-through'
                          )}
                        >
                          {SECTION_LABELS[section.type]}
                        </span>
                        {!section.enabled && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {describe(section)}
                      </p>
                    </button>

                    <IconButton
                      label={section.enabled ? 'Hide' : 'Show'}
                      onClick={() =>
                        patch(section.id, { enabled: !section.enabled })
                      }
                    >
                      {section.enabled ? (
                        <>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
                          />
                        </>
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.7A9.8 9.8 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.2 4M6.2 7.8A17 17 0 002.5 12S6 18.5 12 18.5c.9 0 1.7-.1 2.5-.4"
                        />
                      )}
                    </IconButton>

                    <IconButton
                      label="Remove"
                      danger
                      onClick={() => remove(section.id)}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.9 12a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M4 7h16M9 7V4h6v3"
                      />
                    </IconButton>
                  </div>

                  {open && (
                    <div className="space-y-4 border-t border-gray-200 bg-gray-50/60 p-4">
                      <SectionSettings
                        section={section}
                        onChange={(changes) => patch(section.id, changes)}
                        tags={tags}
                        categories={categories}
                        groupCategories={groupCategories}
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => setAdding(true)}
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Add section
          </Button>
        </div>

        {/* Live preview */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Preview
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-gray-300" />
              <span className="size-2.5 rounded-full bg-gray-300" />
              <span className="size-2.5 rounded-full bg-gray-300" />
              <span className="ml-3 text-xs text-gray-500">
                steamreader.org/
              </span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-8 sm:px-6">
              {layout.sections.some((section) => section.enabled) ? (
                <HomeSections
                  layout={layout}
                  articles={articles}
                  categories={categories}
                  groups={groups}
                  preview
                />
              ) : (
                <p className="py-16 text-center text-sm text-gray-500">
                  Every section is hidden or removed. The front page would be
                  blank.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={adding}
        title="Add a section"
        onClose={() => setAdding(false)}
      >
        <div className="space-y-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => add(type)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="text-sm font-medium text-gray-900">
                {SECTION_LABELS[type]}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {SECTION_DESCRIPTIONS[type]}
              </span>
            </button>
          ))}
          {availableTypes.length === 0 && (
            <p className="text-sm text-gray-500">
              Every section type is already on the page.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        title="Reset the front page?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleReset}>
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This throws away your arrangement and puts the original layout back:
          search, category pills, Courses, a quote, The Learning Lab, then
          Stories &amp; Discoveries. It takes effect on the live site
          immediately.
        </p>
      </Modal>
    </div>
  )
}
