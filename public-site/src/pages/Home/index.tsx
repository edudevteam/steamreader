import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import articlesData from 'data/articles.json'
import categoriesData from 'data/categories.json'
import type { ArticleMeta } from 'types'

const articles = articlesData.articles as ArticleMeta[]
const categories = categoriesData.categories

const quotes = [
  {
    text: "Where curiosity meets discovery, and every question leads to wonder. Explore the frontiers of Science, Technology, Engineering, Arts, and Mathematics — crafted for the dreamers, builders, and thinkers of tomorrow.",
    author: "Inspiring minds, one article at a time"
  },
  {
    text: "In the garden of knowledge, STEAM is the soil where imagination takes root and innovation blooms. Here, we cultivate the seeds of tomorrow's breakthroughs.",
    author: "Nurturing curiosity, harvesting wisdom"
  },
  {
    text: "Every great invention began as a spark of wonder. We gather those sparks here — stories of science, threads of technology, blueprints of engineering, strokes of art, and the poetry of mathematics.",
    author: "From wonder to discovery"
  },
  {
    text: "The universe whispers its secrets to those who dare to listen. Through these pages, we translate the language of atoms, algorithms, and artistic vision into journeys of understanding.",
    author: "Decoding the cosmos, one story at a time"
  },
  {
    text: "Where lab coats meet paintbrushes, where equations dance with creativity — this is the crossroads of human ingenuity. Welcome to the intersection of art and science.",
    author: "Bridging disciplines, building futures"
  },
  {
    text: "Education is not the filling of a vessel, but the lighting of a fire. Here, we bring the matches — ideas that ignite passion and illuminate the path to discovery.",
    author: "Kindling the flames of learning"
  },
  {
    text: "From the microscopic wonders of cells to the infinite expanse of galaxies, from ancient algorithms to tomorrow's innovations — every story here is a door waiting to be opened.",
    author: "Unlocking worlds of possibility"
  },
  {
    text: "The greatest discoveries happen when we look at the world with fresh eyes. These articles are invitations to see the extraordinary hiding within the ordinary.",
    author: "Finding magic in the mundane"
  },
  {
    text: "Science asks why, technology asks how, engineering asks what if, art asks why not, and mathematics reveals the patterns beneath it all. Together, they compose the symphony of progress.",
    author: "Harmonizing the disciplines of discovery"
  },
  {
    text: "Behind every screen, beneath every bridge, within every melody, and beyond every equation lies a story of human creativity. We're here to tell those stories.",
    author: "Celebrating the creators and the curious"
  },
  {
    text: "The next generation of innovators is reading right now. These words plant seeds of wonder that will one day grow into inventions, discoveries, and works of art yet unimagined.",
    author: "Planting seeds for tomorrow's harvest"
  },
  {
    text: "Knowledge is the compass, creativity is the sail, and curiosity is the wind. Set course for discovery — adventure awaits in every article.",
    author: "Charting courses through seas of wonder"
  },
  {
    text: "In a world of infinite questions, we curate the most fascinating answers. From the depths of the ocean to the edge of space, from ancient wisdom to cutting-edge innovation.",
    author: "Curating curiosity for the endlessly curious"
  },
  {
    text: "The boundary between science and magic is simply understanding. Step through these pages, and watch the impossible become beautifully, brilliantly possible.",
    author: "Transforming mystery into mastery"
  },
  {
    text: "Every child is born a scientist, an artist, an engineer. We write for that spark of wonder that never truly fades — only waits to be rekindled.",
    author: "Rekindling the wonder within"
  },
  {
    text: "The stories that change the world often begin with a single curious mind asking 'what if?' Here, we celebrate those questions and the remarkable journeys they inspire.",
    author: "Where 'what if' becomes 'what is'"
  }
]

// Get the latest 3 articles
const getLatestArticles = () => {
  return [...articles]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
}

// Get tutorial articles (by tag)
const getTutorialArticles = () => {
  return [...articles]
    .filter((a) => a.tags.some((t) => t.slug === 'tutorial'))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
}

// Get a random quote
const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length)
  return quotes[randomIndex]
}

export default function HomePage() {
  const latestArticles = getLatestArticles()
  const tutorialArticles = getTutorialArticles()
  const quote = useMemo(() => getRandomQuote(), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <section className="mb-8">
        <Link
          to="/search"
          className="flex w-full items-center gap-3 rounded-full border border-gray-300 bg-white px-5 py-3 text-gray-500 transition-colors hover:border-gray-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span>Search articles by title, author, category, or tags...</span>
        </Link>
      </section>

      {/* Category Pills */}
      <section className="mb-12">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      <section>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Latest Articles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {latestArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/article/${article.slug}`}
              className="group overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={article.featureImage.src}
                  alt={article.featureImage.alt}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    {article.category.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {article.readingTime} min
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-indigo-600">
                  {article.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
                <div className="text-xs text-gray-500">
                  {article.author.name} &#8226; {new Date(article.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="my-16 py-8 text-center">
        <blockquote className="mx-auto max-w-3xl">
          <p className="text-lg font-light italic text-gray-700 md:text-xl">
            "{quote.text}"
          </p>
          <footer className="mt-4 text-xs font-medium text-indigo-600">
            — {quote.author}
          </footer>
        </blockquote>
      </section>

      {/* The Learning Lab - Tutorials */}
      {tutorialArticles.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">The Learning Lab</h2>
              <p className="mt-1 text-sm text-gray-600">Step-by-step guides to master new skills</p>
            </div>
            <Link
              to="/tag/tutorial"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all tutorials &rarr;
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tutorialArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/article/${article.slug}`}
                className="group overflow-hidden rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-md transition-all hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={article.featureImage.src}
                    alt={article.featureImage.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Tutorial
                    </span>
                    <span className="text-xs text-gray-500">
                      {article.readingTime} min
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-indigo-600">
                    {article.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
                  <div className="text-xs text-gray-500">
                    {article.author.name} &#8226; {new Date(article.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
