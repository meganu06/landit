import { supabase } from '../supabase/client';
import { anonymize } from './anonymizer.service';
import { findGaps, describeGap } from './gap-analysis.service';

// Only run gap analysis on the top N placements above a minimum score for efficient OpenAI use.
const GAP_ANALYSIS_MIN_SCORE = 30;
const GAP_ANALYSIS_MAX_PLACEMENTS = 5;

// Bidirectional alias map — all keys and values lowercase
const SKILL_ALIASES: Record<string, string[]> = {
  'javascript': ['js'],
  'typescript': ['ts'],
  'python': ['py'],
  'node.js': ['node', 'nodejs'],
  'node': ['node.js', 'nodejs'],
  'react': ['reactjs', 'react.js'],
  'vue': ['vue.js', 'vuejs'],
  'vue.js': ['vue', 'vuejs'],
  'angular': ['angularjs', 'angular.js'],
  'postgresql': ['postgres', 'psql'],
  'sql': ['postgresql', 'mysql', 'sqlite', 'mssql', 'postgres'],
  'c#': ['csharp', 'dotnet', '.net'],
  '.net': ['dotnet', 'c#', 'csharp'],
  'c++': ['cpp'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'kubernetes': ['k8s'],
  'aws': ['amazon web services'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],
  'docker': ['containerisation', 'containerization'],
  'nosql': ['mongodb', 'dynamodb', 'cassandra'],
  'mongodb': ['nosql'],
  'ruby on rails': ['rails'],
  'next.js': ['nextjs', 'next'],
  'express': ['express.js', 'expressjs'],
};

function skillMatches(studentName: string, placementName: string): boolean {
  const s = (studentName || '').toLowerCase().trim();
  const p = (placementName || '').toLowerCase().trim();
  if (!s || !p) return false;
  if (s === p) return true;
  return (SKILL_ALIASES[p] || []).includes(s) || (SKILL_ALIASES[s] || []).includes(p);
}

interface StudentSkill {
  name: string;
}

interface PlacementSkillRow {
  importance: string;
  skills: { name: string } | null;
}

function calculateMatchScore(
  userSkills: StudentSkill[],
  placementSkills: PlacementSkillRow[]
): { score: number; matched: string[]; missing: string[] } {
  if (!placementSkills.length) return { score: 0, matched: [], missing: [] };

  const reqPs = placementSkills.filter(ps => ps.importance === 'required');
  const prefPs = placementSkills.filter(ps => ps.importance !== 'required');

  const hasSkill = (psName: string): boolean =>
    userSkills.some(ss => skillMatches(ss.name, psName));

  const reqResults = reqPs.map(ps => ({ name: ps.skills?.name ?? '', hit: hasSkill(ps.skills?.name ?? '') }));
  const prefResults = prefPs.map(ps => ({ name: ps.skills?.name ?? '', hit: hasSkill(ps.skills?.name ?? '') }));

  const hitReq = reqResults.filter(x => x.hit);
  const hitPref = prefResults.filter(x => x.hit);
  const missing = reqResults.filter(x => !x.hit).map(x => x.name).filter(Boolean);

  const reqCoverage = reqPs.length > 0 ? hitReq.length / reqPs.length : null;
  const prefCoverage = prefPs.length > 0 ? hitPref.length / prefPs.length : null;

  let score: number;
  if (reqCoverage !== null && prefCoverage !== null) score = Math.round(reqCoverage * 70 + prefCoverage * 30);
  else if (reqCoverage !== null) score = Math.round(reqCoverage * 100);
  else if (prefCoverage !== null) score = Math.round(prefCoverage * 100);
  else score = 0;

  // Soft gate: missing every required skill caps at 20
  if (reqPs.length > 0 && hitReq.length === 0) score = Math.min(score, 20);

  return {
    score: Math.min(score, 100),
    matched: [...hitReq, ...hitPref].map(x => x.name).filter(Boolean),
    missing,
  };
}

export async function runMatchingForUser(userId: string, rawCvText?: string): Promise<void> {
  // Anonymize CV text before handing off to LLMs
  const cvText = rawCvText ? anonymize(rawCvText) : undefined;

  const { data: skillRows, error: skillError } = await supabase
    .from('student_skills')
    .select('proficiency_level, skills(name)')
    .eq('user_id', userId);

  if (skillError) throw new Error(skillError.message);

  const userSkills: StudentSkill[] = (skillRows as unknown as { skills: { name: string } | null }[])
    .map(r => ({ name: r.skills?.name ?? '' }))
    .filter(s => s.name);

  const { data: placements, error: placementError } = await supabase
    .from('placements')
    .select('id, description, placement_skills(importance, skills(name))')
    .eq('is_active', true);

  if (placementError) throw new Error(placementError.message);

  type PlacementRow = { id: string; description: string | null; placement_skills: PlacementSkillRow[] };

  const inserts = (placements as unknown as PlacementRow[]).map(p => {
    const { score, matched, missing } = calculateMatchScore(userSkills, p.placement_skills || []);
    return {
      user_id: userId,
      placement_id: p.id,
      fit_score: score,
      _description: p.description ?? '',
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
        let gapMissing: string[] = r.gap_analysis_report.skills_missing;

        // If CV text is available, use LLM-based comparison for richer gap detection
        if (cvText && r._description) {
          try {
            const gaps = await findGaps(cvText, r._description);
            gapMissing = gaps.missing;
          } catch {
            // Fall back to DB-derived missing skills if LLM call fails
          }
        }

        const advice = await describeGap(gapMissing);
        return { placement_id: r.placement_id, gapMissing, advice };
      })
    );

    for (const result of adviceResults) {
      if (result.status === 'fulfilled') {
        const ins = inserts.find(i => i.placement_id === result.value.placement_id);
        if (ins) {
          ins.gap_analysis_report.skills_missing = result.value.gapMissing;
          ins.gap_analysis_report.advice = result.value.advice;
        }
      }
    }
  }

  // Strip temporary _description before DB insert
  const dbInserts = inserts.map(({ _description, ...rest }) => rest);

  await supabase.from('match_results').delete().eq('user_id', userId);
  if (dbInserts.length) {
    const { error: insertError } = await supabase.from('match_results').insert(dbInserts);
    if (insertError) throw new Error(insertError.message);
  }
}
