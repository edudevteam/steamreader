/**
 * Rewriting `/images/...` references to their R2 URLs.
 *
 * Split out from the migration script so it can be tested directly -- this is
 * the part that edits committed article content in place, where a bad match
 * silently corrupts prose rather than failing loudly.
 */

/**
 * Matches absolute `/images/...` references.
 *
 * The lookbehind is what keeps this from corrupting external URLs: in
 * `https://example.com/images/x.png` the slash is preceded by a word
 * character, so it is left alone.
 */
export const REFERENCE = /(?<![\w:.])\/images\/([A-Za-z0-9._\-/]+)/g

/**
 * Rewrites references whose target is in `uploaded`. Anything else is added to
 * `unknown` and left exactly as it was -- rewriting a path we did not upload
 * just turns a working image into a 404 discovered weeks later.
 *
 * @param {string} text
 * @param {Set<string>} uploaded  relative paths, e.g. "articles/foo.png"
 * @param {Set<string>} unknown   collects unmatched paths, for reporting
 * @param {string} baseUrl        e.g. "https://cdn.steamreader.com/static"
 */
export function rewriteReferences(text, uploaded, unknown, baseUrl) {
  return text.replace(REFERENCE, (match, path) => {
    // A dot is legal in a filename, so the match can swallow the period that
    // ends a sentence. Try the trimmed form before giving up on it.
    const trimmed = path.replace(/\.+$/, '')
    const target = uploaded.has(path) ? path : uploaded.has(trimmed) ? trimmed : null

    if (!target) {
      unknown.add(path)
      return match
    }

    // Whatever was trimmed was punctuation, not filename -- put it back
    // outside the URL.
    return `${baseUrl}/${target}${path.slice(target.length)}`
  })
}
