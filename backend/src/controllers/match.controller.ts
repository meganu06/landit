import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';
import { runMatchingForUser } from '../services/matching.service';

export async function runMatching(req: AuthRequest, res: Response): Promise<void> {
  try {
    // cvText is optional — if the frontend passes it, gap analysis will use it
    // for a richer LLM-based comparison against each placement's job description.
    const cvText: string | undefined = typeof req.body?.cvText === 'string'
      ? req.body.cvText
      : undefined;

    await runMatchingForUser(req.user!.id, cvText);
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
        id, role_name, description, location, salary_range, deadline,
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
