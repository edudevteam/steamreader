import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'

export type VoteType = 'read' | 'tutorial_verified' | 'links_verified' | 'endorsed'

export interface VoteCounts {
  read_count: number
  tutorial_verified_count: number
  links_verified_count: number
  endorsed_count: number
}

export interface UseArticleVotesResult {
  voteCounts: VoteCounts | null
  userVotes: VoteType[]
  loading: boolean
  error: string | null
  toggleVote: (voteType: VoteType) => Promise<void>
  refreshVotes: () => Promise<void>
}

const defaultCounts: VoteCounts = {
  read_count: 0,
  tutorial_verified_count: 0,
  links_verified_count: 0,
  endorsed_count: 0
}

export function useArticleVotes(articleId: string | undefined): UseArticleVotesResult {
  const { user } = useAuth()
  const [voteCounts, setVoteCounts] = useState<VoteCounts | null>(null)
  const [userVotes, setUserVotes] = useState<VoteType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVoteCounts = useCallback(async () => {
    if (!articleId) return

    try {
      const { data, error: fetchError } = await supabase
        .from('article_vote_counts')
        .select('*')
        .eq('article_id', articleId)
        .single()

      if (fetchError) {
        // No votes yet - return defaults
        if (fetchError.code === 'PGRST116') {
          setVoteCounts(defaultCounts)
        } else {
          throw fetchError
        }
      } else {
        setVoteCounts(data as VoteCounts)
      }
    } catch (err) {
      console.error('Error fetching vote counts:', err)
      setVoteCounts(defaultCounts)
    }
  }, [articleId])

  const fetchUserVotes = useCallback(async () => {
    if (!articleId || !user) {
      setUserVotes([])
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('article_votes')
        .select('vote_type')
        .eq('article_id', articleId)
        .eq('user_id', user.id)

      if (fetchError) throw fetchError

      setUserVotes(data?.map(v => v.vote_type as VoteType) || [])
    } catch (err) {
      console.error('Error fetching user votes:', err)
      setUserVotes([])
    }
  }, [articleId, user])

  const refreshVotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchVoteCounts(), fetchUserVotes()])
    setLoading(false)
  }, [fetchVoteCounts, fetchUserVotes])

  useEffect(() => {
    refreshVotes()
  }, [refreshVotes])

  const toggleVote = useCallback(async (voteType: VoteType) => {
    if (!articleId || !user) {
      setError('You must be logged in to vote')
      return
    }

    const hasVote = userVotes.includes(voteType)

    try {
      if (hasVote) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from('article_votes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', user.id)
          .eq('vote_type', voteType)

        if (deleteError) throw deleteError

        // Optimistic update
        setUserVotes(prev => prev.filter(v => v !== voteType))
        setVoteCounts(prev => prev ? {
          ...prev,
          [`${voteType}_count`]: Math.max(0, (prev as any)[`${voteType}_count`] - 1)
        } : null)
      } else {
        // Add vote
        const { error: insertError } = await supabase
          .from('article_votes')
          .insert({
            article_id: articleId,
            user_id: user.id,
            vote_type: voteType
          })

        if (insertError) throw insertError

        // Optimistic update - also add 'read' if not already voted
        // (the database trigger handles this, but we update UI optimistically)
        const newVotes = [...userVotes, voteType]
        if (voteType !== 'read' && !userVotes.includes('read')) {
          newVotes.push('read')
        }
        setUserVotes(newVotes)

        setVoteCounts(prev => {
          if (!prev) return prev
          const updated = {
            ...prev,
            [`${voteType}_count`]: (prev as any)[`${voteType}_count`] + 1
          }
          // Also increment read count if auto-added
          if (voteType !== 'read' && !userVotes.includes('read')) {
            updated.read_count = prev.read_count + 1
          }
          return updated
        })
      }

      // Refresh to get accurate counts
      setTimeout(refreshVotes, 500)
    } catch (err: any) {
      console.error('Error toggling vote:', err)
      setError(err.message || 'Failed to update vote')
      // Refresh to restore accurate state
      refreshVotes()
    }
  }, [articleId, user, userVotes, refreshVotes])

  return {
    voteCounts,
    userVotes,
    loading,
    error,
    toggleVote,
    refreshVotes
  }
}
