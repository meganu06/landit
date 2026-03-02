import { supabase } from '../supabase/client';

function calculateMatchScore(
  userSkills: string[],
  requiredSkills: string[],
  desiredSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  const normalised = userSkills.map(s => s.toLowerCase().trim());

  const matchedRequired = requiredSkills.filter(s => normalised.includes(s.toLowerCase().trim()));
  const matchedDesired = desiredSkills.filter(s => normalised.includes(s.toLowerCase().trim()));
  const matched = [...new Set([...matchedRequired, ...matchedDesired])];

  const missingRequired = requiredSkills.filter(s => !normalised.includes(s.toLowerCase().trim()));
  const missingDesired = desiredSkills.filter(s => !normalised.includes(s.toLowerCase().trim()));
  const missing = [...new Set([...missingRequired, ...missingDesired])];

  const totalWeight = requiredSkills.length * 2 + desiredSkills.length;
  if (totalWeight === 0) return { score: 0, matched, missing };

  const earnedWeight = matchedRequired.length * 2 + matchedDesired.length;
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { score, matched, missing };
}

export async function runMatchingForUser(userId: string): Promise<void> {
  // Get user's skills — join to skills table since student_skills uses skill_id FK
  const { data: skillRows, error: skillError } = await supabase
    .from('student_skills')
    .select('skills(name)')
    .eq('user_id', userId);

  if (skillError) throw new Error(skillError.message);

  const userSkills: string[] = (skillRows as unknown as { skills: unknown }[])
    .map(s => {
      const sk = s.skills as { name: string } | null;
      return sk?.name ?? null;
    })
    .filter((n): n is string => Boolean(n));

  // Get all active placements with their skills via placement_skills junction table
  const { data: placements, error: placementError } = await supabase
    .from('placements')
    .select('id, placement_skills(importance, skills(name))')
    .eq('is_active', true);

  if (placementError) throw new Error(placementError.message);

  type PlacementWithSkills = { id: string; placement_skills: { importance: string; skills: { name: string } | null }[] };

  const inserts = (placements as unknown as PlacementWithSkills[]).map(p => {
    const reqSkills  = p.placement_skills.filter(ps => ps.importance === 'required').map(ps => ps.skills?.name ?? '').filter(Boolean);
    const prefSkills = p.placement_skills.filter(ps => ps.importance !== 'required').map(ps => ps.skills?.name ?? '').filter(Boolean);
    const { score, matched, missing } = calculateMatchScore(userSkills, reqSkills, prefSkills);
    return {
      user_id: userId,
      placement_id: p.id,
      fit_score: score,
      gap_analysis_report: { skills_matched: matched, skills_missing: missing },
    };
  });

  await supabase.from('match_results').delete().eq('user_id', userId);
  if (inserts.length === 0) return;

  const { error: insertError } = await supabase.from('match_results').insert(inserts);
  if (insertError) throw new Error(insertError.message);
}
