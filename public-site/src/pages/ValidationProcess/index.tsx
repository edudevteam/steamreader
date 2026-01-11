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
        {/* Validated Tutorial */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-700">Validated Tutorial</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            A qualified reviewer has successfully completed this tutorial from start to finish,
            verifying that all steps work as described and produce the expected results.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">Verification criteria:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>All code examples compile and run without errors</li>
            <li>Step-by-step instructions are accurate and complete</li>
            <li>Final outcome matches what is promised in the tutorial</li>
            <li>Prerequisites and requirements are clearly stated</li>
          </ul>
        </div>

        {/* Supported Evidence */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-blue-700">Supported Evidence</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            All references, citations, and external links in this article have been verified
            for credibility and accessibility.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">Verification criteria:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>All external links are working and accessible</li>
            <li>Sources are from reputable and authoritative websites</li>
            <li>Scientific claims are backed by peer-reviewed research when applicable</li>
            <li>Statistics and data are current and accurately represented</li>
          </ul>
        </div>

        {/* Community Approved */}
        <div className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1">
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-purple-700">Community Approved</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-xs font-bold text-white">
                42
              </span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What it means</h2>
          <p className="mb-4 text-gray-600">
            Community members have read and endorsed this article as accurate, helpful, and valuable.
            The number indicates how many people have given their approval.
          </p>
          <h3 className="mb-2 font-semibold text-gray-900">How community approval works:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-600">
            <li>Registered community members can approve articles they find valuable</li>
            <li>Each member can only approve an article once</li>
            <li>Higher numbers indicate broader community consensus</li>
            <li>Approvals can be withdrawn if content quality changes</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Questions?</h2>
        <p className="text-gray-600">
          If you have questions about our validation process or would like to become a reviewer,
          please <Link to="/contact" className="text-indigo-600 hover:text-indigo-700 hover:underline">contact us</Link>.
        </p>
      </div>
    </div>
  )
}
