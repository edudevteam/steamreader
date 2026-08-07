import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">About Us</h1>

      <div className="prose prose-lg prose-brand">
        <p>
          Welcome to our platform dedicated to providing high-quality educational content
          for curious minds of all ages.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe that learning should be accessible, engaging, and fun. Our mission
          is to create and curate content that sparks curiosity and empowers readers
          to explore new topics with confidence.
        </p>

        <h2>Quality Commitment</h2>
        <p>
          Every article on our platform goes through a rigorous validation process.
          We verify tutorials work as described, ensure sources are credible, and
          listen to our community's feedback to maintain the highest standards.
        </p>

        <h2>Our Team</h2>
        <p>
          Our team consists of educators, subject matter experts, and passionate
          writers who share a common goal: making knowledge accessible to everyone.
        </p>

        <h2>Who Can Write Articles</h2>
        <p>
          Students and community members are welcome to contribute — but writing
          access is granted, not automatic. Accounts come in four levels:
        </p>
        <ul>
          <li>
            <strong>Reader</strong> — what every new account starts as. You can read
            every published article and vote on them. No writing.
          </li>
          <li>
            <strong>Writer</strong> — can draft and edit their own articles and submit
            them for review. Writers cannot publish; an editor has to approve the work
            first.
          </li>
          <li>
            <strong>Editor</strong> — reviews, edits and publishes any article, and
            manages categories and tags.
          </li>
          <li>
            <strong>Admin</strong> — everything an editor can do, plus managing accounts.
          </li>
        </ul>
        <p>
          So creating an account does not by itself let you post — you'll be a Reader
          until an admin promotes you to Writer. If you'd like to contribute,{' '}
          <Link to="/signup">create an account</Link> first, then{' '}
          <Link to="/support">get in touch</Link> and tell us what you'd like to write
          about. Everything submitted goes through our{' '}
          <Link to="/validation-process">validation process</Link> before it goes live.
        </p>
      </div>
    </div>
  )
}
