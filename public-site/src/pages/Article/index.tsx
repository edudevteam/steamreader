import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { Article } from 'types'

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadArticle() {
      try {
        const articleModule = await import(`../../data/articles/${slug}.json`)
        setArticle(articleModule.default as Article)
      } catch {
        setError('Article not found')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadArticle()
    }
  }, [slug])

  const handleCopy = useCallback(async (code: string, button: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(code)
      const icon = button.querySelector('.copy-icon') as HTMLElement
      const text = button.querySelector('.copy-text') as HTMLElement
      if (icon && text) {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />`
        icon.classList.add('text-green-400')
        text.textContent = 'Copied!'
        setTimeout(() => {
          icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />`
          icon.classList.remove('text-green-400')
          text.textContent = 'Copy code'
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  // Add copy buttons to code blocks
  useEffect(() => {
    if (!contentRef.current || !article) return

    const codeBlocks = contentRef.current.querySelectorAll('pre')
    codeBlocks.forEach((pre) => {
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
      header.className = 'flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700'

      // Create language label
      const languageLabel = document.createElement('span')
      languageLabel.className = 'text-xs font-medium text-gray-400'
      languageLabel.textContent = language

      // Create copy button
      const button = document.createElement('button')
      button.className = 'copy-button flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors'
      button.setAttribute('aria-label', 'Copy code')
      button.innerHTML = `
        <svg class="copy-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
  }, [article, handleCopy])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="mb-4 h-8 rounded bg-gray-200"></div>
          <div className="h-4 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Article Not Found</h1>
        <p className="mb-8 text-gray-600">The article you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-block rounded-full bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = article.title

  const socialLinks = [
    {
      name: 'Twitter',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    },
    {
      name: 'Email',
      href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  const SocialShareButtons = () => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-500">Share:</span>
      {socialLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
          aria-label={`Share on ${link.name}`}
        >
          {link.icon}
        </a>
      ))}
    </div>
  )

  const ValidationBadgesDisplay = () => {
    if (!article.validation) return null

    const badges = []

    if (article.validation.validatedTutorial) {
      badges.push(
        <div key="validated" className="group relative flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-green-700">Validated Tutorial</span>
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            This tutorial has been successfully completed by a reviewer
          </div>
        </div>
      )
    }

    if (article.validation.supportedEvidence) {
      badges.push(
        <div key="evidence" className="group relative flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1">
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-blue-700">Supported Evidence</span>
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            References and links have been verified as credible and working
          </div>
        </div>
      )
    }

    if (article.validation.communityApproved && article.validation.communityApproved > 0) {
      badges.push(
        <div key="community" className="group relative flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1">
          <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium text-purple-700">Community Approved</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-xs font-bold text-white">
            {article.validation.communityApproved}
          </span>
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {article.validation.communityApproved} community members approve this article
          </div>
        </div>
      )
    }

    if (badges.length === 0) return null

    return (
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {badges}
        <Link
          to="/validation-process"
          className="text-xs text-gray-500 hover:text-indigo-600 hover:underline"
        >
          What's this?
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Social Share - Top */}
      <div className="mb-6">
        <SocialShareButtons />
      </div>

      {/* Validation Badges */}
      <ValidationBadgesDisplay />

      {/* Article Header */}
      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            to={`/category/${article.category.slug}`}
            className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-200"
          >
            {article.category.name}
          </Link>
          <span className="text-sm text-gray-500">{article.readingTime} min read</span>
        </div>

        <h1 className="mb-3 text-4xl font-bold text-gray-900">{article.title}</h1>

        {article.subtitle && (
          <p className="mb-4 text-xl text-gray-600">{article.subtitle}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link
            to={`/author/${article.author.slug}`}
            className="font-medium hover:text-indigo-600"
          >
            {article.author.name}
          </Link>
          <span>&#8226;</span>
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
        </div>
      </header>

      {/* Feature Image */}
      <figure className="mb-8">
        <img
          src={article.featureImage.src}
          alt={article.featureImage.alt}
          className="w-full rounded-xl"
        />
        {article.featureImage.caption && (
          <figcaption className="mt-2 text-center text-sm text-gray-500">
            {article.featureImage.caption}
          </figcaption>
        )}
      </figure>

      {/* Article Content */}
      <div
        ref={contentRef}
        className="prose prose-lg prose-indigo mx-auto"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Tags */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Tags:</span>
          {article.tags.map((tag) => (
            <Link
              key={tag.slug}
              to={`/tag/${tag.slug}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Previous / Next Navigation */}
      {(article.previousArticle || article.nextArticle) && (
        <nav className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex items-stretch gap-4">
            {article.previousArticle ? (
              <Link
                to={`/article/${article.previousArticle.slug}`}
                className="flex-1 group rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="text-sm text-gray-500">Previous</span>
                <div className="mt-1 flex items-center gap-2 text-gray-900 group-hover:text-indigo-600">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">{article.previousArticle.title}</span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {article.nextArticle ? (
              <Link
                to={`/article/${article.nextArticle.slug}`}
                className="flex-1 group rounded-lg border border-gray-200 p-4 text-right transition-colors hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="text-sm text-gray-500">Next</span>
                <div className="mt-1 flex items-center justify-end gap-2 text-gray-900 group-hover:text-indigo-600">
                  <span className="font-medium">{article.nextArticle.title}</span>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </nav>
      )}

      {/* Social Share - Bottom */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <SocialShareButtons />
      </div>
    </article>
  )
}
