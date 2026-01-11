import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mb-8 max-w-md text-gray-600">
        Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't
        exist.
      </p>
      <Link
        to="/"
        className="inline-block rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
      >
        Back to Home
      </Link>
    </div>
  )
}
