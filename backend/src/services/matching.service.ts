import { supabase } from '../supabase/client';

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

// ─── SCORE TUNING ────────────────────────────────────────────────────────────
// REQ_CURVE_POWER  exponent on requiredCoverage — 0.5 = sqrt (lenient), 1.0 = linear (strict)
// REQ_WEIGHT       % of score from required skills  (must sum with PREF_WEIGHT to 100)
// PREF_WEIGHT      % of score from preferred skills
// FLOOR_BOOST      bonus added when at least 1 required skill is matched
// LOW_CAP_MAX      max score when requiredCoverage < 0.2 (prevents weak-match inflation)
const REQ_CURVE_POWER = 0.5;  // raise toward 1.0 to be stricter
const REQ_WEIGHT      = 75;   // lower = required skills hurt less
const PREF_WEIGHT     = 25;   // raise = preferred skills rewarded more
const FLOOR_BOOST     = 8;    // raise for more optimistic partial matches
const LOW_CAP_MAX     = 40;   // raise to be more lenient on very weak matches
// ─────────────────────────────────────────────────────────────────────────────

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

const reqPs  = placementSkills.filter(ps => ps.importance === 'required');
const prefPs = placementSkills.filter(ps => ps.importance !== 'required');

const hasSkill = (psName: string): boolean =>
userSkills.some(ss => skillMatches(ss.name, psName));

const reqResults  = reqPs.map(ps  => ({ name: ps.skills?.name ?? '', hit: hasSkill(ps.skills?.name ?? '') }));
const prefResults = prefPs.map(ps => ({ name: ps.skills?.name ?? '', hit: hasSkill(ps.skills?.name ?? '') }));

const hitReq  = reqResults.filter(x => x.hit);
const hitPref = prefResults.filter(x => x.hit);
const missing = reqResults.filter(x => !x.hit).map(x => x.name).filter(Boolean);

const reqCoverage  = reqPs.length  > 0 ? hitReq.length  / reqPs.length  : null;
const prefCoverage = prefPs.length > 0 ? hitPref.length / prefPs.length : 0;

let score: number;

if (reqCoverage !== null) {
const curvedReq = Math.pow(reqCoverage, REQ_CURVE_POWER);
score = Math.round(100 * ((REQ_WEIGHT / 100) * curvedReq + (PREF_WEIGHT / 100) * prefCoverage));
if (hitReq.length > 0) score += FLOOR_BOOST;
if (reqCoverage < 0.2) score = Math.min(score, LOW_CAP_MAX);
} else if (prefPs.length > 0) {
score = Math.round(100 * ((PREF_WEIGHT / 100) * prefCoverage));
} else {
score = 0;
}

score = Math.max(0, Math.min(score, 100));

return {
score,
matched: [...hitReq, ...hitPref].map(x => x.name).filter(Boolean),
missing,
};
}

export async function runMatchingForUser(userId: string): Promise<void> {
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
.select('id, placement_skills(importance, skills(name))')
.eq('is_active', true);

if (placementError) throw new Error(placementError.message);

type PlacementRow = { id: string; placement_skills: PlacementSkillRow[] };

const inserts = (placements as unknown as PlacementRow[]).map(p => {
const { score, matched, missing } = calculateMatchScore(userSkills, p.placement_skills || []);
return {
user_id: userId,
placement_id: p.id,
fit_score: score,
gap_analysis_report: { skills_matched: matched, skills_missing: missing },
};
});

await supabase.from('match_results').delete().eq('user_id', userId);
if (inserts.length) {
const { error: insertError } = await supabase.from('match_results').insert(inserts);
if (insertError) throw new Error(insertError.message);
}
}
