import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';
import { runMatchingForUser } from '../services/matching.service';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function runMatching(req: AuthRequest, res: Response): Promise<void> {
  try {
    await runMatchingForUser(req.user!.id);
    res.json({ message: 'Matching complete' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

export async function getMatchResults(req: AuthRequest, res: Response): Promise<void> {
  const minScore = req.query.minScore ? Number(req.query.minScore) : 0;

  const { data, error } = await supabase
    .from('match_results')
    .select(`
      *,
      placements (
        id, title, description, location, salary_range, deadline,
        required_skills, desired_skills,
        companies (name, logo_url, website)
      )
    `)
    .eq('user_id', req.user!.id)
    .gte('fit_score', minScore)
    .order('fit_score', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}

export async function getGapAnalysis(req: AuthRequest, res: Response): Promise<void> {
  const { placementId } = req.params;
  const userId = req.user!.id;

  const { data: matchResult, error } = await supabase
    .from('match_results')
    .select('gap_analysis_report, placements(title)')
    .eq('user_id', userId)
    .eq('placement_id', placementId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!matchResult) {
    res.status(404).json({ error: 'No match result found. Run matching first.' });
    return;
  }

  const missingSkills: string[] = matchResult.gap_analysis_report?.skills_missing ?? [];

  if (missingSkills.length === 0) {
    res.json({ placement_id: placementId, missing_skills: [] });
    return;
  }

  const roleName = (matchResult.placements as unknown as { title: string } | null)?.title ?? 'this role';

  let recommendations: { skill: string; how_to_improve: string[] }[] = [];

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a career development advisor. Given a list of missing required technical skills for a job role, ' +
            'return a JSON array where each object has "skill" (the skill name) and "how_to_improve" ' +
            '(an array of exactly 3 concise, actionable steps to learn that skill — include official docs, free courses, or a project to build). ' +
            'Return ONLY valid JSON — no explanation, no markdown.',
        },
        {
          role: 'user',
          content: `Role: ${roleName}\nMissing required skills: ${missingSkills.join(', ')}`,
        },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0].message.content?.trim() ?? '[]';
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    recommendations = JSON.parse(clean);
    if (!Array.isArray(recommendations)) recommendations = [];
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations: ' + (err as Error).message });
    return;
  }

  res.json({ placement_id: placementId, missing_skills: recommendations });
}
