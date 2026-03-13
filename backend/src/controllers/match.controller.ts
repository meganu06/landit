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
    .select('gap_analysis_report, placements(title, description, companies(name))')
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

  const placement = matchResult.placements as unknown as {
    title: string;
    description: string;
    companies: { name: string } | null;
  } | null;

  const roleName = placement?.title ?? 'this role';
  const companyName = placement?.companies?.name ?? null;
  const roleDescription = placement?.description ?? null;

  let recommendations: { skill: string; how_to_improve: string[] }[] = [];

  try {
    const userContent = [
      `Role: ${roleName}`,
      companyName ? `Company: ${companyName}` : null,
      roleDescription ? `Role description: ${roleDescription.slice(0, 600)}` : null,
      `Missing required skills: ${missingSkills.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a senior industry mentor helping a university student prepare for a specific placement role. ' +
            'Given a job role, company, role description, and a list of skills the student is missing, ' +
            'return a JSON array where each object has:\n' +
            '- "skill": the skill name\n' +
            '- "how_to_improve": an array of exactly 3 highly specific, actionable steps tailored to THIS role and industry.\n\n' +
            'Each step must:\n' +
            '- Reference the specific role or industry context (e.g. "for a data engineering role at a fintech...")\n' +
            '- Be concrete — name actual tools, frameworks, courses, or project ideas directly relevant to the job\n' +
            '- Progress in difficulty: step 1 = foundation, step 2 = applied practice, step 3 = role-relevant project or portfolio piece\n\n' +
            'Do NOT give generic advice like "read the docs" or "take an online course". Be specific.\n' +
            'Return ONLY valid JSON — no explanation, no markdown.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      temperature: 0.4,
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
