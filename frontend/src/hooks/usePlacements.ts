import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase.ts'

export function usePlacements(userSkills: any[] = []) {
  const [placements, setPlacements] = useState<any[]>([])
  const [matchScores, setMatchScores] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlacements()
  }, [])

  useEffect(() => {
    if (placements.length > 0) {
      calculateMatches()
    }
  }, [placements, userSkills])

  async function loadPlacements() {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('placements')
        .select(`
          *,
          companies (name, industry, website_url),
          placement_skills (
            importance,
            skills (name, category)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setPlacements(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load placements')
    } finally {
      setLoading(false)
    }
  }

  function calculateScore(placement: any) {
    const userSkillNames = userSkills.map(s => 
      (s.skills?.name || s.skill_name || '').toLowerCase()
    )
    const placementSkills = placement.placement_skills || []
    const required = placement.required_skills || []
    const desired = placement.desired_skills || []

    if (placementSkills.length > 0) {
      const reqPs = placementSkills.filter((ps: any) => ps.importance === 'required')
      const prefPs = placementSkills.filter((ps: any) => ps.importance !== 'required')
      
      const matchedReq = reqPs.filter((ps: any) =>
        userSkillNames.includes((ps.skills?.name || '').toLowerCase())
      )
      const matchedPref = prefPs.filter((ps: any) =>
        userSkillNames.includes((ps.skills?.name || '').toLowerCase())
      )

      const totalWeight = reqPs.length * 2 + prefPs.length
      const score = totalWeight > 0
        ? Math.round((matchedReq.length * 2 + matchedPref.length) / totalWeight * 100)
        : 0

      const matched = [...matchedReq, ...matchedPref]
        .map((ps: any) => ps.skills?.name)
        .filter(Boolean)
      const missing = reqPs
        .filter((ps: any) => !userSkillNames.includes((ps.skills?.name || '').toLowerCase()))
        .map((ps: any) => ps.skills?.name)
        .filter(Boolean)

      return { score, matched, missing }
    }

    if (required.length > 0 || desired.length > 0) {
      const matchedReq = required.filter((s: string) => userSkillNames.includes((s || '').toLowerCase()))
      const matchedDes = desired.filter((s: string) => userSkillNames.includes((s || '').toLowerCase()))
      const totalWeight = required.length * 2 + desired.length
      const score = totalWeight > 0
        ? Math.round((matchedReq.length * 2 + matchedDes.length) / totalWeight * 100)
        : 0
      return { 
        score, 
        matched: [...matchedReq, ...matchedDes],
        missing: required.filter((s: string) => !userSkillNames.includes((s || '').toLowerCase()))
      }
    }

    return { score: 0, matched: [], missing: [] }
  }

  async function calculateMatches() {
    const scores: Record<string, any> = {}
    const inserts = []

    for (const placement of placements) {
      const result = calculateScore(placement)
      scores[placement.id] = result

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        inserts.push({
          user_id: user.id,
          placement_id: placement.id,
          fit_score: result.score,
          gap_analysis_report: {
            skills_matched: result.matched,
            skills_missing: result.missing
          }
        })
      }
    }

    setMatchScores(scores)

    const { data: { user } } = await supabase.auth.getUser()
    if (user && inserts.length > 0) {
      await supabase.from('match_results').delete().eq('user_id', user.id)
      await supabase.from('match_results').insert(inserts)
    }
  }

  const sortedPlacements = [...placements].sort((a, b) => {
    const scoreA = matchScores[a.id]?.score || 0
    const scoreB = matchScores[b.id]?.score || 0
    return scoreB - scoreA
  })

  return {
    placements: sortedPlacements,
    matchScores,
    loading,
    error,
    reload: loadPlacements,
    recalculateMatches: calculateMatches
  }
}
