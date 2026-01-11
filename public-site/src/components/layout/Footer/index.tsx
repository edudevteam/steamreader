import { Link } from 'react-router-dom'

const categories = [
  { name: 'Science', href: '/category/science' },
  { name: 'Technology', href: '/category/technology' },
  { name: 'Engineering', href: '/category/engineering' },
  { name: 'Arts', href: '/category/arts' },
  { name: 'Mathematics', href: '/category/mathematics' }
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                <li key={category.name}>
                  <Link
                    to={category.href}
                    className="text-sm text-gray-600 transition-colors hover:text-indigo-600"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
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
