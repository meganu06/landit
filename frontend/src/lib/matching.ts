import { Placement, StudentSkill, MatchScore } from '@/types'

export function calculateMatchScore(
  placement: Placement,
  userSkills: StudentSkill[]
): MatchScore {
  const userSkillNames = userSkills
    .map(s => (s.skills?.name || s.skill_name || '').toLowerCase())

  const placementSkills = placement.placement_skills || []
  const required = placement.required_skills || []
  const desired = placement.desired_skills || []

  // Strategy 1: Use placement_skills table (preferred)
  if (placementSkills.length > 0) {
    const reqPs = placementSkills.filter(ps => ps.importance === 'required')
    const prefPs = placementSkills.filter(ps => ps.importance !== 'required')
    
    const matchedReq = reqPs.filter(ps =>
      userSkillNames.includes((ps.skills?.name || '').toLowerCase())
    )
    const matchedPref = prefPs.filter(ps =>
      userSkillNames.includes((ps.skills?.name || '').toLowerCase())
    )
    
    const totalWeight = reqPs.length * 2 + prefPs.length
    const score = totalWeight > 0
      ? Math.round((matchedReq.length * 2 + matchedPref.length) / totalWeight * 100)
      : 0
    
    const matched = [...matchedReq, ...matchedPref]
      .map(ps => ps.skills?.name)
      .filter(Boolean) as string[]
    
    const missing = reqPs
      .filter(ps => !userSkillNames.includes((ps.skills?.name || '').toLowerCase()))
      .map(ps => ps.skills?.name)
      .filter(Boolean) as string[]
    
    return { score, matched, missing }
  }

  // Strategy 2: Use legacy required_skills/desired_skills arrays
  if (required.length > 0 || desired.length > 0) {
    const matchedReq = required.filter(s =>
      userSkillNames.includes((s || '').toLowerCase())
    )
    const matchedDes = desired.filter(s =>
      userSkillNames.includes((s || '').toLowerCase())
    )
    
    const totalWeight = required.length * 2 + desired.length
    const score = totalWeight > 0
      ? Math.round((matchedReq.length * 2 + matchedDes.length) / totalWeight * 100)
      : 0
    
    return {
      score,
      matched: [...matchedReq, ...matchedDes],
      missing: required.filter(s => !userSkillNames.includes((s || '').toLowerCase())),
    }
  }

  return { score: 0, matched: [], missing: [] }
}
