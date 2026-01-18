import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import articlesData from 'data/articles.json'
import categoriesData from 'data/categories.json'
import type { ArticleMeta } from 'types'
import { filterPublishedArticles } from 'utils'
import ArticleCarousel from 'components/ArticleCarousel'

const articles = filterPublishedArticles(articlesData.articles as ArticleMeta[])
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

// Get the latest articles (sorted by date)
const getLatestArticles = () => {
  return [...articles]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

// Get tutorial articles (by tag)
const getTutorialArticles = () => {
  return [...articles]
    .filter((a) => a.tags.some((t) => t.slug === 'tutorial'))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
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
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/search')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <section className="mb-8">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, author, category, or tags..."
            className="w-full rounded-full border border-gray-300 bg-white px-5 py-3 pl-12 text-gray-900 placeholder-gray-500 transition-colors hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </form>
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
      <ArticleCarousel
        articles={latestArticles}
        title="Latest Articles"
        count={3}
        viewAllLink="/latest"
        viewAllText="View all articles"
      />

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
        <div className="mt-16">
          <ArticleCarousel
            articles={tutorialArticles}
            title="The Learning Lab"
            subtitle="Step-by-step guides to master new skills"
            count={3}
            variant="tutorial"
            viewAllLink="/tag/tutorial"
            viewAllText="View all tutorials"
          />
        </div>
      )}
    </div>
  )
}
