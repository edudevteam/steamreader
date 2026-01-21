import { useEffect, useState } from 'react'
import { supabase } from 'lib/supabase'

interface VoteBadgesProps {
  articleId: string | undefined
  compact?: boolean
}

interface VoteCounts {
  read_count: number
  tutorial_verified_count: number
  links_verified_count: number
  endorsed_count: number
}

export default function VoteBadges({ articleId, compact = false }: VoteBadgesProps) {
  const [counts, setCounts] = useState<VoteCounts | null>(null)

  useEffect(() => {
    if (!articleId) return

    async function fetchCounts() {
      const { data } = await supabase
        .from('article_vote_counts')
        .select('*')
        .eq('article_id', articleId)
        .single()

      if (data) {
        setCounts(data as VoteCounts)
      }
    }

    fetchCounts()
  }, [articleId])

  if (!counts) return null

  const hasAnyVotes = counts.read_count > 0 ||
    counts.tutorial_verified_count > 0 ||
    counts.links_verified_count > 0 ||
    counts.endorsed_count > 0

  if (!hasAnyVotes) return null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {counts.read_count > 0 && (
          <span className="flex items-center gap-0.5" title="Readers">
            <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {counts.read_count}
          </span>
        )}
        {counts.tutorial_verified_count > 0 && (
          <span className="flex items-center gap-0.5" title="Certified">
            <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {counts.tutorial_verified_count}
          </span>
        )}
        {counts.links_verified_count > 0 && (
          <span className="flex items-center gap-0.5" title="Links Verified">
            <svg className="h-3.5 w-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {counts.links_verified_count}
          </span>
        )}
        {counts.endorsed_count > 0 && (
          <span className="flex items-center gap-0.5" title="Endorsed">
            <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {counts.endorsed_count}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {counts.read_count > 0 && (
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {counts.read_count}
        </div>
      )}
      {counts.tutorial_verified_count > 0 && (
        <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700" title="Certified">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {counts.tutorial_verified_count}
        </div>
      )}
      {counts.links_verified_count > 0 && (
        <div className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {counts.links_verified_count}
        </div>
      )}
      {counts.endorsed_count > 0 && (
        <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {counts.endorsed_count}
        </div>
      )}
    </div>
  )
}
