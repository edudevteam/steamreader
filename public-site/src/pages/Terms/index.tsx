export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">Terms and Conditions</h1>

      <div className="prose prose-lg prose-brand">
        <p className="text-gray-600">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using STEAM Reader, you accept and agree to be bound by the terms
          and conditions of this agreement. If you do not agree to these terms, please do not
          use our services.
        </p>

        <h2>2. Age Requirements</h2>
        <p>
          You must be at least 13 years old to create an account and use our services.
          By creating an account, you confirm that you meet this age requirement.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          When you create an account, you are responsible for maintaining the security of your
          account and password. You agree to accept responsibility for all activities that
          occur under your account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>
          You agree to use STEAM Reader only for lawful purposes. You may not use our services to:
        </p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe upon the rights of others</li>
          <li>Submit false or misleading information</li>
          <li>Distribute malware or harmful content</li>
          <li>Attempt to gain unauthorized access to our systems</li>
        </ul>

        <h2>5. Content</h2>
        <p>
          All content provided on STEAM Reader is for educational purposes. While we strive
          to ensure accuracy, we make no warranties about the completeness, reliability, or
          accuracy of the information provided.
        </p>

        <h2>6. User Contributions</h2>
        <p>
          When you vote on or interact with articles, you agree that your contributions
          will be used to help improve content quality for all users. You retain no
          ownership rights over aggregated voting data.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Your use of STEAM Reader is also governed by our Privacy Policy. By using our
          services, you consent to the collection and use of information as described
          in that policy.
        </p>

        <h2>8. Termination</h2>
        <p>
          We reserve the right to terminate or suspend your account at any time, without
          prior notice, for conduct that we believe violates these terms or is harmful
          to other users or our services.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of STEAM Reader after
          any changes constitutes acceptance of the new terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          If you have any questions about these Terms and Conditions, please contact us
          through our contact page.
        </p>
      </div>
    </div>
  )
}
