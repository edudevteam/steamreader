import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { classNames } from 'utils'
import { useAuth } from 'context/AuthContext'

const navigation = [
  {
    name: 'Home',
    href: '/',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: 'Random',
    href: '/random',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
  {
    name: 'Latest',
    href: '/latest',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    name: 'Categories',
    href: '/categories',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    name: 'Tags',
    href: '/tags',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  {
    name: 'Search',
    href: '/search',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  }
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, profile, signOut, signingOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-50 shadow-md">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="STEAM Reader" className="h-8 w-auto" />
                <span className="text-xl font-bold text-gray-900">STEAM Reader</span>
              </Link>
            </div>

            {/* Menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
              style={{ backgroundColor: '#673ab7' }}
              aria-expanded={menuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium">Menu</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Slide-out menu */}
      <div
        className={classNames(
          'fixed inset-0 z-50 transition-opacity duration-300',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMenuOpen(false)}
        />

        {/* Slide-out panel */}
        <div
          className={classNames(
            'absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transition-transform duration-300',
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Panel header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
            <span className="text-lg font-semibold text-gray-900">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="sr-only">Close menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto">
            {/* Navigation links */}
            <div className="flex-1 px-4 py-4">
              <div className="flex flex-col space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      classNames(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Auth section */}
            <div className="border-t border-gray-200 px-4 py-4">
              {user ? (
                <>
                  <div className="mb-3 px-3">
                    <p className="text-sm font-medium text-gray-900">{profile?.display_name || 'User'}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <NavLink
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      classNames(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account
                  </NavLink>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {signingOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      classNames(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      classNames(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Sign Up
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
