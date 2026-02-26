import { supabase } from '../supabase/client';

/**
 * Calculates a weighted match score between a student's skills and a placement's requirements.
 *
 * Weighting logic (FR10):
 *  - Required skills are worth 2x points
 *  - Preferred/desired skills are worth 1x points
 *
 * Example: Job needs 5 required skills, student has 4 of them = high score.
 *
 * @param userSkills     - Array of skill names the student has
 * @param requiredSkills - Skills the placement marks as 'required'
 * @param desiredSkills  - Skills the placement marks as 'preferred' or 'desired'
 * @returns score (0-100), matched skill names, missing skill names
 */
function calculateMatchScore(
  userSkills: string[],
  requiredSkills: string[],
  desiredSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  const normalised = userSkills.map(s => s.toLowerCase().trim());

  const matchedRequired = requiredSkills.filter(s =>
    normalised.includes(s.toLowerCase().trim())
  );
  const matchedDesired = desiredSkills.filter(s =>
    normalised.includes(s.toLowerCase().trim())
  );
  const matched = [...new Set([...matchedRequired, ...matchedDesired])];

  const missingRequired = requiredSkills.filter(
    s => !normalised.includes(s.toLowerCase().trim())
  );
  const missingDesired = desiredSkills.filter(
    s => !normalised.includes(s.toLowerCase().trim())
  );
  const missing = [...new Set([...missingRequired, ...missingDesired])];

  // Required skills are worth 2x, preferred skills are worth 1x
  const totalWeight = requiredSkills.length * 2 + desiredSkills.length;
  if (totalWeight === 0) return { score: 0, matched, missing };

  const earnedWeight = matchedRequired.length * 2 + matchedDesired.length;
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { score, matched, missing };
}

type SkillRow = { skills: { name: string } | { name: string }[] | null };

function extractSkillName(skills: SkillRow['skills']): string | null {
  if (!skills) return null;
  if (Array.isArray(skills)) return skills[0]?.name ?? null;
  return skills.name ?? null;
}

/**
 * Runs the full matching algorithm for a given student user.
 *
 * Steps:
 *  1. Fetch the student's skills from the database.
 *  2. Fetch all active placements and their required/preferred skills.
 *  3. Calculate weighted match score for each placement.
 *  4. Upsert results into the match_results table.
 *
 * @param userId - The UUID of the student user (FR10)
 */
export async function runMatchingForUser(userId: string): Promise<void> {
  // Step 1: Fetch student's skills via junction table
  const { data: skillRows, error: skillError } = await supabase
    .from('student_skills')
    .select('skills(name)')
    .eq('user_id', userId);

  if (skillError) throw new Error(skillError.message);

  const userSkills: string[] = (skillRows as unknown as SkillRow[])
    .map(s => extractSkillName(s.skills))
    .filter((n): n is string => Boolean(n));

  // Step 2: Fetch all active placements with their skills
  const { data: placements, error: placementError } = await supabase
    .from('placements')
    .select('id, placement_skills(importance, skills(name))')
    .eq('is_active', true);

  if (placementError) throw new Error(placementError.message);

  type PlacementWithSkills = {
    id: string;
    placement_skills: {
      importance: string;
      skills: { name: string } | null;
    }[];
  };

  // Step 3: Calculate weighted match score for each placement
  const inserts = (placements as unknown as PlacementWithSkills[]).map(p => {
    const reqSkills = p.placement_skills
      .filter(ps => ps.importance === 'required')
      .map(ps => ps.skills?.name ?? '')
      .filter(Boolean);

    const prefSkills = p.placement_skills
      .filter(ps => ps.importance !== 'required')
      .map(ps => ps.skills?.name ?? '')
      .filter(Boolean);

    const { score, matched, missing } = calculateMatchScore(
      userSkills,
      reqSkills,
      prefSkills
    );

    return {
      user_id: userId,
      placement_id: p.id,
      fit_score: score,
      gap_analysis_report: {
        skills_matched: matched,
        skills_missing: missing,
      },
    };
  });

  // Step 4: Replace previous match results for this user and insert fresh ones
  await supabase.from('match_results').delete().eq('user_id', userId);
  if (inserts.length === 0) return;

  const { error: insertError } = await supabase
    .from('match_results')
    .insert(inserts);
  if (insertError) throw new Error(insertError.message);
}
