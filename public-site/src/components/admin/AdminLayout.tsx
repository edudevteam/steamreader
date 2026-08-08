import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import { classNames } from 'utils'
import { RoleBadge } from './ui'
import type { Role } from 'types'
import 'styles/admin.css'

interface NavItem {
  name: string
  href: string
  /** Lowest role that may see this item. */
  minimum: Role
  end?: boolean
  icon: ReactNode
}

const NAVIGATION: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    minimum: 'writer',
    end: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"
      />
    )
  },
  {
    name: 'Articles',
    href: '/admin/articles',
    minimum: 'writer',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    )
  },
  {
    name: 'Courses',
    href: '/admin/courses',
    minimum: 'editor',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    )
  },
  {
    name: 'Categories & Tags',
    href: '/admin/taxonomy',
    minimum: 'editor',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    )
  },
  {
    name: 'Users',
    href: '/admin/users',
    minimum: 'admin',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    )
  },
  {
    name: 'My profile',
    href: '/admin/profile',
    minimum: 'writer',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M5.121 17.804A13 13 0 0112 16c2.5 0 4.847.7 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    )
  }
]

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="size-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {children}
    </svg>
  )
}

export default function AdminLayout() {
  const { profile, user, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleNav = NAVIGATION.filter((item) => {
    const rank = { user: 0, writer: 1, editor: 2, admin: 3 }
    return rank[role] >= rank[item.minimum]
  })

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-5">
        <img src="/logo.png" alt="" className="h-8 w-auto" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-gray-900">STEAM Reader</div>
          <div className="text-xs text-gray-500">Content Studio</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <NavIcon>{item.icon}</NavIcon>
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <NavIcon>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </NavIcon>
          View public site
        </Link>

        <div className="mt-2 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile?.display_name || 'Account'}
              </p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <RoleBadge role={role} />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div
        className={classNames(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? '' : 'pointer-events-none'
        )}
      >
        <div
          className={classNames(
            'absolute inset-0 bg-gray-900/50 transition-opacity',
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={classNames(
            'absolute inset-y-0 left-0 w-64 bg-white shadow-xl transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebar}
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          >
            <span className="sr-only">Open navigation</span>
            <svg
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">
            Content Studio
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
