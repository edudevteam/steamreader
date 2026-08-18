import { useCallback, useEffect, type RefObject } from 'react'

const COPY_ICON = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />`
const CHECK_ICON = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />`

/**
 * Wraps every `pre` inside `containerRef` in a header bar carrying the language
 * label and a copy button.
 *
 * The rendered article HTML is injected with `dangerouslySetInnerHTML`, so this
 * decoration has to happen in the DOM afterwards rather than in the markdown
 * pipeline. Pass whatever changes the injected HTML as `deps` so the buttons
 * are reattached; already-wrapped blocks are skipped, so re-runs are cheap.
 */
export function useCodeBlockCopyButtons(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
): void {
  const handleCopy = useCallback(
    async (code: string, button: HTMLButtonElement) => {
      try {
        await navigator.clipboard.writeText(code)
        const icon = button.querySelector('.copy-icon') as HTMLElement
        const text = button.querySelector('.copy-text') as HTMLElement
        if (icon && text) {
          icon.innerHTML = CHECK_ICON
          icon.classList.add('text-green-400')
          text.textContent = 'Copied!'
          setTimeout(() => {
            icon.innerHTML = COPY_ICON
            icon.classList.remove('text-green-400')
            text.textContent = 'Copy code'
          }, 2000)
        }
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    },
    []
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.querySelectorAll('pre').forEach((pre) => {
      // Skip if already wrapped
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return

      const code = pre.querySelector('code')
      if (!code) return

      // Create wrapper
      const wrapper = document.createElement('div')
      wrapper.className = 'code-block-wrapper rounded-lg overflow-hidden my-4'

      // Extract language from code class (e.g., "hljs language-bash" -> "bash")
      const languageMatch = code.className.match(/language-(\w+)/)
      const language = languageMatch ? languageMatch[1] : ''

      // Create header bar
      const header = document.createElement('div')
      header.className =
        'flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700'

      // Create language label
      const languageLabel = document.createElement('span')
      languageLabel.className = 'text-xs font-medium text-gray-400'
      languageLabel.textContent = language

      // Create copy button
      const button = document.createElement('button')
      button.className =
        'copy-button flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors'
      button.setAttribute('aria-label', 'Copy code')
      button.innerHTML = `
        <svg class="copy-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${COPY_ICON}
        </svg>
        <span class="copy-text">Copy code</span>
      `

      button.addEventListener('click', () => {
        handleCopy(code.textContent || '', button)
      })

      header.appendChild(languageLabel)
      header.appendChild(button)

      // Wrap the pre element
      pre.parentNode?.insertBefore(wrapper, pre)
      wrapper.appendChild(header)
      wrapper.appendChild(pre)

      // Remove default margins from pre since wrapper handles spacing
      pre.style.marginTop = '0'
      pre.style.marginBottom = '0'
      pre.style.borderTopLeftRadius = '0'
      pre.style.borderTopRightRadius = '0'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, handleCopy, ...deps])
}

export default useCodeBlockCopyButtons
