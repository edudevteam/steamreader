import { Link } from 'react-router-dom'
import { useAuth } from 'context/AuthContext'
import { useArticleVotes, VoteType } from 'hooks/useArticleVotes'
import { classNames } from 'utils'

interface VoteButtonsProps {
  articleId: string | undefined
}

interface VoteConfig {
  type: VoteType
  label: string
  activeLabel: string
  icon: JSX.Element
  activeColor: string
  hoverColor: string
  bgColor: string
  description: string
}

const voteConfigs: VoteConfig[] = [
  {
    type: 'read',
    label: 'Mark as Read',
    activeLabel: 'Read',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    activeColor: 'text-green-600',
    hoverColor: 'hover:text-green-600 hover:bg-green-50',
    bgColor: 'bg-green-100',
    description: 'I have read this article'
  },
  {
    type: 'tutorial_verified',
    label: 'Certified',
    activeLabel: 'Certified',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    activeColor: 'text-blue-600',
    hoverColor: 'hover:text-blue-600 hover:bg-blue-50',
    bgColor: 'bg-blue-100',
    description: 'I completed this tutorial successfully'
  },
  {
    type: 'links_verified',
    label: 'Links Verified',
    activeLabel: 'Links OK',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    activeColor: 'text-purple-600',
    hoverColor: 'hover:text-purple-600 hover:bg-purple-50',
    bgColor: 'bg-purple-100',
    description: 'All links and videos are working'
  },
  {
    type: 'endorsed',
    label: 'Endorse',
    activeLabel: 'Endorsed',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
    activeColor: 'text-amber-600',
    hoverColor: 'hover:text-amber-600 hover:bg-amber-50',
    bgColor: 'bg-amber-100',
    description: 'I personally recommend this content'
  }
]

export default function VoteButtons({ articleId }: VoteButtonsProps) {
  const { user } = useAuth()
  const { voteCounts, userVotes, loading, error, toggleVote } = useArticleVotes(articleId)

  if (!articleId) return null

  const getCount = (type: VoteType): number => {
    if (!voteCounts) return 0
    const key = `${type}_count` as keyof typeof voteCounts
    return voteCounts[key] || 0
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Community Feedback</h3>
        {!user && (
          <Link to="/login" className="text-xs text-indigo-600 hover:text-indigo-500">
            Sign in to vote
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {voteConfigs.map((config) => {
          const isActive = userVotes.includes(config.type)
          const count = getCount(config.type)

          return (
            <button
              key={config.type}
              onClick={() => toggleVote(config.type)}
              disabled={!user || loading}
              title={config.description}
              className={classNames(
                'group relative flex flex-col items-center gap-1 rounded-lg border p-3 transition-all',
                isActive
                  ? `${config.bgColor} border-transparent ${config.activeColor}`
                  : `border-gray-200 text-gray-500 ${user ? config.hoverColor : 'cursor-not-allowed opacity-60'}`
              )}
            >
              {config.icon}
              <span className="text-xs font-medium">
                {isActive ? config.activeLabel : config.label}
              </span>
              <span className={classNames(
                'text-sm font-bold',
                isActive ? config.activeColor : 'text-gray-700'
              )}>
                {count}
              </span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {config.description}
              </div>
            </button>
          )
        })}
      </div>

      {user && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Click to toggle your vote. Verifying or endorsing auto-marks as read.
        </p>
      )}
    </div>
  )
}
