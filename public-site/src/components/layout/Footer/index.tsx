import { Link } from 'react-router-dom'
import categoriesData from 'data/categories.json'
import type { Category } from 'types'

const categories = categoriesData.categories as Category[]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Mobile: Brand on top, 3 columns below */}
        {/* Tablet+: All 4 in a row */}

        {/* Brand - full width on mobile, part of grid on tablet+ */}
        <div className="mb-8 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="STEAM Reader" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-900">STEAM Reader</span>
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            Inspiring the next generation through Science, Technology, Engineering, Arts, and Mathematics.
          </p>
        </div>

        {/* Mobile: 3 columns for links */}
        <div className="grid grid-cols-3 gap-4 md:hidden">
          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              Categories
            </h3>
            <ul className="mt-3 space-y-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              Resources
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/validation-process"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Validation Process
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/newsletter"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="text-xs text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Search Articles
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Tablet and above: 4 columns */}
        <div className="hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="STEAM Reader" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">STEAM Reader</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              Inspiring the next generation through Science, Technology, Engineering, Arts, and Mathematics.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Categories
            </h3>
            <ul className="mt-4 space-y-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Resources
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/validation-process"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Validation Process
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/newsletter"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                >
                  Search Articles
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {currentYear} STEAM Reader. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
