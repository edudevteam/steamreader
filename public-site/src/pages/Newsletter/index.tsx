export default function NewsletterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-brand-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h1 className="mt-4 text-4xl font-bold text-gray-900">Newsletter</h1>
        <p className="mt-4 text-lg text-gray-600">
          Get the latest articles, tutorials, and updates delivered straight to your inbox.
        </p>
      </div>

      <div className="mt-10 rounded-lg bg-gray-50 p-8 text-center">
        <span className="inline-block rounded-full bg-brand-100 px-4 py-1 text-sm font-medium text-brand-700">
          Coming Soon
        </span>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          We're working on it!
        </h2>
        <p className="mt-2 text-gray-600">
          Our newsletter is currently under development. Check back soon to subscribe.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="text-center text-lg font-semibold text-gray-900">What you'll get:</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="mt-3 font-medium text-gray-900">New Articles</h3>
            <p className="mt-1 text-sm text-gray-600">
              Be the first to know when new content is published
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="mt-3 font-medium text-gray-900">Tips & Tricks</h3>
            <p className="mt-1 text-sm text-gray-600">
              Exclusive insights and learning resources
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="mt-3 font-medium text-gray-900">Community Updates</h3>
            <p className="mt-1 text-sm text-gray-600">
              News about events and community highlights
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
