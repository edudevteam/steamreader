/**
 * The quote pool the home page's quote section draws from.
 *
 * Lifted out of the page when the front page became editable: the layout can
 * now place the quote block anywhere, and the admin preview renders the same
 * component, so the pool needed a home that neither of them owns.
 */
const quotes: { text: string; author: string }[] = [
  {
    text: 'Where curiosity meets discovery, and every question leads to wonder. Explore the frontiers of Science, Technology, Engineering, Arts, and Mathematics — crafted for the dreamers, builders, and thinkers of tomorrow.',
    author: 'Inspiring minds, one article at a time'
  },
  {
    text: "In the garden of knowledge, STEAM is the soil where imagination takes root and innovation blooms. Here, we cultivate the seeds of tomorrow's breakthroughs.",
    author: 'Nurturing curiosity, harvesting wisdom'
  },
  {
    text: 'Every great invention began as a spark of wonder. We gather those sparks here — stories of science, threads of technology, blueprints of engineering, strokes of art, and the poetry of mathematics.',
    author: 'From wonder to discovery'
  },
  {
    text: 'The universe whispers its secrets to those who dare to listen. Through these pages, we translate the language of atoms, algorithms, and artistic vision into journeys of understanding.',
    author: 'Decoding the cosmos, one story at a time'
  },
  {
    text: 'Where lab coats meet paintbrushes, where equations dance with creativity — this is the crossroads of human ingenuity. Welcome to the intersection of art and science.',
    author: 'Bridging disciplines, building futures'
  },
  {
    text: 'Education is not the filling of a vessel, but the lighting of a fire. Here, we bring the matches — ideas that ignite passion and illuminate the path to discovery.',
    author: 'Kindling the flames of learning'
  },
  {
    text: "From the microscopic wonders of cells to the infinite expanse of galaxies, from ancient algorithms to tomorrow's innovations — every story here is a door waiting to be opened.",
    author: 'Unlocking worlds of possibility'
  },
  {
    text: 'The greatest discoveries happen when we look at the world with fresh eyes. These articles are invitations to see the extraordinary hiding within the ordinary.',
    author: 'Finding magic in the mundane'
  },
  {
    text: 'Science asks why, technology asks how, engineering asks what if, art asks why not, and mathematics reveals the patterns beneath it all. Together, they compose the symphony of progress.',
    author: 'Harmonizing the disciplines of discovery'
  },
  {
    text: "Behind every screen, beneath every bridge, within every melody, and beyond every equation lies a story of human creativity. We're here to tell those stories.",
    author: 'Celebrating the creators and the curious'
  },
  {
    text: 'The next generation of innovators is reading right now. These words plant seeds of wonder that will one day grow into inventions, discoveries, and works of art yet unimagined.',
    author: "Planting seeds for tomorrow's harvest"
  },
  {
    text: 'Knowledge is the compass, creativity is the sail, and curiosity is the wind. Set course for discovery — adventure awaits in every article.',
    author: 'Charting courses through seas of wonder'
  },
  {
    text: 'In a world of infinite questions, we curate the most fascinating answers. From the depths of the ocean to the edge of space, from ancient wisdom to cutting-edge innovation.',
    author: 'Curating curiosity for the endlessly curious'
  },
  {
    text: 'The boundary between science and magic is simply understanding. Step through these pages, and watch the impossible become beautifully, brilliantly possible.',
    author: 'Transforming mystery into mastery'
  },
  {
    text: 'Every child is born a scientist, an artist, an engineer. We write for that spark of wonder that never truly fades — only waits to be rekindled.',
    author: 'Rekindling the wonder within'
  },
  {
    text: "The stories that change the world often begin with a single curious mind asking 'what if?' Here, we celebrate those questions and the remarkable journeys they inspire.",
    author: "Where 'what if' becomes 'what is'"
  }
]

export interface Quote {
  text: string
  author: string
}

/** One quote, picked fresh on every visit. */
export const getRandomQuote = (): Quote => {
  const randomIndex = Math.floor(Math.random() * quotes.length)
  return quotes[randomIndex]
}
