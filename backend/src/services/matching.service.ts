import { supabase } from '../supabase/client';
import { describeGap } from './gap-analysis.service';

// Only run gap analysis on the top N placements above a minimum score for efficient OpenAI use.
const GAP_ANALYSIS_MIN_SCORE = 30;
const GAP_ANALYSIS_MAX_PLACEMENTS = 5;

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
  // Get user's skills from the student_skills → skills join
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

  // Fetch all active placements with their skills
  const { data: placements, error: placementError } = await supabase
    .from('placements')
    .select('id, placement_skills(importance, skills(name))')
    .eq('is_active', true);

  if (placementError) throw new Error(placementError.message);

  type PlacementRow = {
    id: string;
    placement_skills: { importance: string; skills: { name: string } | null }[];
  };

  // Compute fit scores for every placement
  const inserts = (placements as unknown as PlacementRow[]).map(p => {
    const reqSkills  = p.placement_skills
      .filter(ps => ps.importance === 'required')
      .map(ps => ps.skills?.name ?? '')
      .filter(Boolean);
    const prefSkills = p.placement_skills
      .filter(ps => ps.importance !== 'required')
      .map(ps => ps.skills?.name ?? '')
      .filter(Boolean);

    const { score, matched, missing } = calculateMatchScore(userSkills, reqSkills, prefSkills);

    return {
      user_id: userId,
      placement_id: p.id,
      fit_score: score,
      gap_analysis_report: {
        skills_matched: matched,
        skills_missing: missing,
        advice: null as string | null,
      },
    };
  });

  // Run gap analysis for top N qualifying placements
  const topForGap = [...inserts]
    .filter(r => r.fit_score >= GAP_ANALYSIS_MIN_SCORE)
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, GAP_ANALYSIS_MAX_PLACEMENTS);

  if (topForGap.length > 0) {
    const adviceResults = await Promise.allSettled(
      topForGap.map(async r => {
        const advice = await describeGap(r.gap_analysis_report.skills_missing);
        return { placement_id: r.placement_id, advice };
      })
    );

    for (const result of adviceResults) {
      if (result.status === 'fulfilled') {
        const ins = inserts.find(i => i.placement_id === result.value.placement_id);
        if (ins) ins.gap_analysis_report.advice = result.value.advice;
      }
    }
  }

  const dbInserts = inserts;

  await supabase.from('match_results').delete().eq('user_id', userId);
  if (dbInserts.length === 0) return;

  const { error: insertError } = await supabase.from('match_results').insert(dbInserts);
  if (insertError) throw new Error(insertError.message);
}
