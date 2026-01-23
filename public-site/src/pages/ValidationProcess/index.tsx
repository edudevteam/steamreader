import { Link } from 'react-router-dom'

export default function ValidationProcessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">Validation Process</h1>

      <p className="mb-8 text-lg text-gray-600">
        We use a validation system to help readers identify trustworthy and verified content.
        Each badge represents a different level of verification that an article has undergone.
      </p>

      <div className="space-y-8">
        {/* Mark as Read */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-700">Mark as Read</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            A community member has read this article. This helps track engagement and indicates
            that the content has been reviewed by the community.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">How it works:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>Any registered user can mark an article as read</li>
            <li>Reading is automatically recorded when you verify or endorse an article</li>
            <li>Higher read counts indicate more community engagement</li>
            <li>You can toggle your read status at any time</li>
          </ul>
        </div>

        {/* Certified */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium text-blue-700">Certified</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            A community member has successfully completed this tutorial from start to finish,
            verifying that all steps work as described and produce the expected results.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">Certification criteria:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>All code examples compile and run without errors</li>
            <li>Step-by-step instructions are accurate and complete</li>
            <li>Final outcome matches what is promised in the tutorial</li>
            <li>Prerequisites and requirements are clearly stated</li>
          </ul>
        </div>

        {/* Links Verified */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1">
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm font-medium text-purple-700">Links Verified</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            A community member has verified that all external links and embedded videos in this
            article are working and accessible.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">Verification criteria:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>All external links are working and accessible</li>
            <li>Embedded videos play correctly</li>
            <li>Referenced resources are still available</li>
            <li>Links point to the intended destinations</li>
          </ul>
        </div>

        {/* Endorse */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1">
              <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              <span className="text-sm font-medium text-amber-700">Endorse</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            A community member personally recommends this content as valuable, accurate, and helpful.
            Endorsements indicate strong approval from the community.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">How endorsements work:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>Registered community members can endorse articles they find valuable</li>
            <li>Each member can only endorse an article once</li>
            <li>Higher numbers indicate broader community consensus</li>
            <li>Endorsements can be withdrawn if needed</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Questions?</h2>
        <p className="text-gray-600">
          If you have questions about our validation process or would like to become a reviewer,
          please <Link to="/contact" className="text-brand-600 hover:text-brand-700 hover:underline">contact us</Link>.
        </p>
      </div>
    </div>
  )
}
