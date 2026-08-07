/**
 * The package ships types for its root entry only, but the root is unusable in
 * a browser -- it eagerly requires a Node stream wrapper. `src/lib/markdown.ts`
 * imports the pure function directly, so it needs its own declaration.
 */
declare module 'reading-time/lib/reading-time.js' {
  interface ReadingTimeResult {
    text: string
    minutes: number
    time: number
    words: number
  }

  interface ReadingTimeOptions {
    wordBound?: (char: string) => boolean
    wordsPerMinute?: number
  }

  export default function readingTime(
    text: string,
    options?: ReadingTimeOptions
  ): ReadingTimeResult
}
