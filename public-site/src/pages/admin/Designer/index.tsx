/**
 * The Designer.
 *
 * Three pages of the public site are ordered lists of sections rather than
 * fixed markup -- the front page, every category archive, every tag archive --
 * and this screen edits those lists and nothing else. Sections move up and
 * down, switch off without being deleted, and each carries its own settings.
 *
 * One surface is edited at a time, chosen by the tabs at the top. Each keeps
 * its own unsaved state while the screen is open, so switching tabs to compare
 * two pages does not throw away work in progress; the "unsaved" badge on a tab
 * says which ones still need saving.
 *
 * The preview beside the list is the real `PageSections` component with the
 * real content, so there is no mock of the site to fall out of date. It runs
 * in `preview` mode, where a section with nothing to show says so instead of
 * disappearing. Category and tag previews render against a real category or
 * tag, picked in the preview chrome, since one layout serves them all.
 *
 * Admin only, matching the "Admins manage site settings" policy. A save is
 * live the moment it lands -- there is no draft -- which is the reason this is
 * not open to editors.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import PageSections from 'components/page/PageSections'
import type { ArchiveContext } from 'components/page/PageSections'
import {
  getPageLayout,
  resetPageLayout,
  savePageLayout
} from 'lib/cms/pageLayout'
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
import { classNames, filterPublishedArticles } from 'utils'
import {
  DEFAULT_LAYOUTS,
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
  SINGLETON_SECTIONS,
  SURFACE_DESCRIPTIONS,
  SURFACE_LABELS,
  SURFACE_SECTIONS,
  createSection
} from 'types'
import type {
  ArticlesSection,
  GroupCategoryRow,
  GroupsSection,
  HeaderSection,
  PageLayout,
  PageSection,
  PageSectionType,
  PageSurface,
  ResultsSection,
  SearchSection,
  TextSection
} from 'types'

const SURFACES: PageSurface[] = ['home', 'category', 'tag']

/** The path each surface's preview chrome shows in its address bar. */
const SURFACE_PATHS: Record<PageSurface, string> = {
  home: 'steamreader.org/',
  category: 'steamreader.org/category/',
  tag: 'steamreader.org/tag/'
}

/** What "reset" puts back, spelled out before someone confirms it. */
const RESET_SUMMARY: Record<PageSurface, string> = {
  home: 'search, category pills, Courses, a quote, The Learning Lab, then Stories & Discoveries',
  category:
    'the page header, then the category’s articles as a three-column grid',
  tag: 'the page header, then the tag’s articles as a three-column grid'
}

/** One surface's editing state, kept per tab so switching loses nothing. */
interface SurfaceState {
  layout: PageLayout
  /** The last saved layout as JSON, to tell an edit from an undo. */
  saved: string
  /** False when no row exists yet, i.e. the page is on the built-in default. */
  customised: boolean
  updatedAt: string | null
}

/** The one-line summary each row shows under its type. */
function describe(section: PageSection): string {
  switch (section.type) {
    case 'header': {
      const shown = [
        section.showBreadcrumb ? 'breadcrumb' : null,
        'title',
        section.showDescription ? 'description' : null,
        section.showCount ? 'count' : null
      ].filter(Boolean)
      return shown.join(', ')
    }
    case 'results':
      return section.style === 'list'
        ? 'A list, one article per row'
        : `A grid, ${section.columns} across`
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

/** A labelled checkbox, for the show/hide switches on header and results. */
function Toggle({
  label,
  checked,
  onChange,
  hint
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  )
}

// ------------------------------------------------------------ per-type form

interface SettingsProps {
  section: PageSection
  surface: PageSurface
  onChange: (patch: Partial<PageSection>) => void
  tags: { slug: string; name: string }[]
  categories: { slug: string; name: string }[]
  groupCategories: GroupCategoryRow[]
}

function HeaderSettings({
  section,
  surface,
  onChange
}: SettingsProps & { section: HeaderSection }) {
  return (
    <>
      <p className="text-sm text-gray-500">
        The title block. The name itself is always shown — it is what tells a
        reader where they are.
      </p>

      <div className="space-y-2">
        <Toggle
          label="Breadcrumb"
          checked={section.showBreadcrumb}
          onChange={(showBreadcrumb) => onChange({ showBreadcrumb })}
          hint={
            surface === 'tag'
              ? 'Home / Tags / #name'
              : 'Home / Categories / name'
          }
        />
        {surface === 'category' && (
          <Toggle
            label="Description"
            checked={section.showDescription}
            onChange={(showDescription) => onChange({ showDescription })}
            hint="The category’s own description, where it has one."
          />
        )}
        <Toggle
          label="Article count"
          checked={section.showCount}
          onChange={(showCount) => onChange({ showCount })}
        />
      </div>

      <Field label="Alignment">
        <Select
          value={section.align}
          onChange={(event) =>
            onChange({ align: event.target.value as HeaderSection['align'] })
          }
        >
          <option value="left">Left</option>
          <option value="center">Centred</option>
        </Select>
      </Field>
    </>
  )
}

function ResultsSettings({
  section,
  surface,
  onChange
}: SettingsProps & { section: ResultsSection }) {
  return (
    <>
      <p className="text-sm text-gray-500">
        {surface === 'tag'
          ? 'Every article carrying this tag.'
          : 'Every article in this category.'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shape">
          <Select
            value={section.style}
            onChange={(event) =>
              onChange({ style: event.target.value as ResultsSection['style'] })
            }
          >
            <option value="grid">Grid of cards</option>
            <option value="list">List, one per row</option>
          </Select>
        </Field>

        {section.style === 'grid' && (
          <Field
            label="Columns"
            hint="At the widest screens. Narrower steps down."
          >
            <Select
              value={String(section.columns)}
              onChange={(event) =>
                onChange({ columns: Number(event.target.value) })
              }
            >
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
              <option value="4">Four</option>
            </Select>
          </Field>
        )}
      </div>

      <Field label="Order">
        <Select
          value={section.sort}
          onChange={(event) =>
            onChange({ sort: event.target.value as ResultsSection['sort'] })
          }
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">By title, A–Z</option>
        </Select>
      </Field>

      <Field label="On each card">
        <div className="space-y-2">
          <Toggle
            label="Excerpt"
            checked={section.showExcerpt}
            onChange={(showExcerpt) => onChange({ showExcerpt })}
          />
          <Toggle
            label="Category"
            checked={section.showCategory}
            onChange={(showCategory) => onChange({ showCategory })}
            hint={
              surface === 'category'
                ? 'Every article here is in the same category.'
                : 'A tag spans categories, so this says which.'
            }
          />
          <Toggle
            label="Reading time"
            checked={section.showReadingTime}
            onChange={(showReadingTime) => onChange({ showReadingTime })}
          />
          <Toggle
            label="Author"
            checked={section.showAuthor}
            onChange={(showAuthor) => onChange({ showAuthor })}
          />
          <Toggle
            label="Date"
            checked={section.showDate}
            onChange={(showDate) => onChange({ showDate })}
          />
        </div>
      </Field>

      <Field
        label="When there is nothing"
        hint="Shown on an archive with no published articles."
      >
        <Input
          value={section.emptyText}
          onChange={(event) => onChange({ emptyText: event.target.value })}
        />
      </Field>
    </>
  )
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
    case 'header':
      return <HeaderSettings {...props} section={section} />

    case 'results':
      return <ResultsSettings {...props} section={section} />

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

export default function DesignerPage() {
  const [surface, setSurface] = useState<PageSurface>('home')
  const [states, setStates] = useState<Record<
    PageSurface,
    SurfaceState
  > | null>(null)

  const [groupCategories, setGroupCategories] = useState<GroupCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // Which category or tag the archive preview renders against. Empty means
  // "the first one", resolved once the content has loaded.
  const [previewSlug, setPreviewSlug] = useState<Record<PageSurface, string>>({
    home: '',
    category: '',
    tag: ''
  })

  const { data: articles } = useArticles()
  const { data: categories } = useCategories()
  const { data: groups } = useGroups()
  const { data: tags } = useTags()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [home, category, tag, nextGroupCategories] = await Promise.all([
        getPageLayout('home'),
        getPageLayout('category'),
        getPageLayout('tag'),
        listGroupCategories()
      ])

      const toState = (stored: {
        layout: PageLayout
        customised: boolean
        updatedAt: string | null
      }): SurfaceState => ({
        layout: stored.layout,
        saved: JSON.stringify(stored.layout),
        customised: stored.customised,
        updatedAt: stored.updatedAt
      })

      setStates({
        home: toState(home),
        category: toState(category),
        tag: toState(tag)
      })
      setGroupCategories(nextGroupCategories)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load the layouts'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const current = states?.[surface] ?? null

  // Compared as JSON rather than by reference: every edit rebuilds the object,
  // so identity would call an undone change unsaved.
  const dirtyOn = useCallback(
    (which: PageSurface) => {
      const state = states?.[which]
      if (!state) return false
      return JSON.stringify(state.layout) !== state.saved
    },
    [states]
  )
  const dirty = dirtyOn(surface)

  const published = useMemo(() => filterPublishedArticles(articles), [articles])

  /** The category or tag the preview stands in for, and its articles. */
  const previewArchive = useMemo<ArchiveContext | undefined>(() => {
    if (surface === 'category') {
      const chosen =
        categories.find((c) => c.slug === previewSlug.category) ?? categories[0]
      if (!chosen) return undefined
      return {
        kind: 'category',
        name: chosen.name,
        description: chosen.description,
        articles: published.filter((a) => a.category.slug === chosen.slug)
      }
    }

    if (surface === 'tag') {
      const chosen = tags.find((t) => t.slug === previewSlug.tag) ?? tags[0]
      if (!chosen) return undefined
      return {
        kind: 'tag',
        name: chosen.name,
        articles: published.filter((a) =>
          a.tags.some((t) => t.slug === chosen.slug)
        )
      }
    }

    return undefined
  }, [surface, categories, tags, previewSlug, published])

  const setLayout = (next: PageSection[]) => {
    setNotice(null)
    setStates((previous) =>
      previous
        ? {
            ...previous,
            [surface]: {
              ...previous[surface],
              layout: { version: 1, sections: next }
            }
          }
        : previous
    )
  }

  const sections = current?.layout.sections ?? []

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    setLayout(next)
  }

  const patch = (id: string, changes: Partial<PageSection>) =>
    setLayout(
      sections.map((section) =>
        section.id === id
          ? ({ ...section, ...changes } as PageSection)
          : section
      )
    )

  const remove = (id: string) =>
    setLayout(sections.filter((section) => section.id !== id))

  const add = (type: PageSectionType) => {
    const section = createSection(type)
    setLayout([...sections, section])
    setOpenId(section.id)
    setAdding(false)
  }

  const handleSave = async () => {
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      await savePageLayout(surface, current.layout)
      setStates((previous) =>
        previous
          ? {
              ...previous,
              [surface]: {
                ...previous[surface],
                saved: JSON.stringify(previous[surface].layout),
                customised: true,
                updatedAt: new Date().toISOString()
              }
            }
          : previous
      )
      setNotice(`${SURFACE_LABELS[surface]} saved. Live now.`)
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
      await resetPageLayout(surface)
      setConfirmReset(false)
      setStates((previous) =>
        previous
          ? {
              ...previous,
              [surface]: {
                layout: DEFAULT_LAYOUTS[surface],
                saved: JSON.stringify(DEFAULT_LAYOUTS[surface]),
                customised: false,
                updatedAt: null
              }
            }
          : previous
      )
      setNotice(`${SURFACE_LABELS[surface]} reset to the original layout.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset')
    } finally {
      setBusy(false)
    }
  }

  // A second search bar, header or article list is never what someone meant.
  const availableTypes = SURFACE_SECTIONS[surface].filter(
    (type) =>
      !SINGLETON_SECTIONS.includes(type) ||
      !sections.some((section) => section.type === type)
  )

  if (loading || !current) return <LoadingBlock label="Loading the layouts…" />

  const previewOptions = surface === 'category' ? categories : tags

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designer</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The arrangement of the site&apos;s three laid-out pages. Reorder the
            sections, switch one off, or add another. Saving publishes straight
            to the live site — there is no draft.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={busy || !current.customised}
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

      {/* Surface tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-6">
          {SURFACES.map((which) => (
            <button
              key={which}
              type="button"
              onClick={() => {
                setSurface(which)
                setOpenId(null)
                setNotice(null)
              }}
              className={classNames(
                'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                which === surface
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              )}
            >
              {SURFACE_LABELS[which]}
              {dirtyOn(which) && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Unsaved
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <p className="mb-4 text-xs text-gray-400">
        {SURFACE_DESCRIPTIONS[surface]}{' '}
        {current.customised
          ? `Custom layout${
              current.updatedAt
                ? `, last saved ${new Date(current.updatedAt).toLocaleString()}`
                : ''
            }`
          : 'Using the original built-in layout'}
      </p>

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
            Unsaved changes to {SURFACE_LABELS[surface].toLowerCase()}. The
            preview below is what visitors will see once you save.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Section list */}
        <div>
          <div className="space-y-2">
            {sections.map((section, index) => {
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
                        disabled={index === sections.length - 1}
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
                        surface={surface}
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
                {SURFACE_PATHS[surface]}
              </span>

              {/* One layout serves every archive, so the preview picks one. */}
              {surface !== 'home' && previewOptions.length > 0 && (
                <select
                  value={
                    previewOptions.some(
                      (option) => option.slug === previewSlug[surface]
                    )
                      ? previewSlug[surface]
                      : previewOptions[0]?.slug ?? ''
                  }
                  onChange={(event) =>
                    setPreviewSlug((previous) => ({
                      ...previous,
                      [surface]: event.target.value
                    }))
                  }
                  className="ml-1 rounded border-none bg-transparent py-0 text-xs text-gray-700 focus:ring-1 focus:ring-brand-500"
                >
                  {previewOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.slug}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-8 sm:px-6">
              {surface !== 'home' && !previewArchive ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  No {surface === 'tag' ? 'tags' : 'categories'} yet, so there
                  is nothing to preview this layout against.
                </p>
              ) : sections.some((section) => section.enabled) ? (
                <PageSections
                  layout={current.layout}
                  articles={articles}
                  categories={categories}
                  groups={groups}
                  archive={previewArchive}
                  preview
                />
              ) : (
                <p className="py-16 text-center text-sm text-gray-500">
                  Every section is hidden or removed. The page would be blank.
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
        title={`Reset ${SURFACE_LABELS[surface].toLowerCase()}?`}
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
          This throws away your arrangement and puts the original layout back:{' '}
          {RESET_SUMMARY[surface]}. It takes effect on the live site
          immediately, and leaves the other pages alone.
        </p>
      </Modal>
    </div>
  )
}
