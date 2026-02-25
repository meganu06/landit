import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';

/**
 * POST /apply
 * Links the authenticated user to a placement in the applications table.
 * Source: FR15 (Dashboard tracking)
 */
export async function applyToPlacement(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { placement_id } = req.body;

  if (!placement_id) {
    res.status(400).json({ error: 'placement_id is required' });
    return;
  }

  // Prevent duplicate applications
  const { data: existing, error: checkError } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .eq('placement_id', placement_id)
    .maybeSingle();

  if (checkError) {
    res.status(500).json({ error: checkError.message });
    return;
  }

  if (existing) {
    res.status(409).json({ error: 'You have already applied to this placement' });
    return;
  }

  // Check the placement exists and is active
  const { data: placement, error: placementError } = await supabase
    .from('placements')
    .select('id, role_name')
    .eq('id', placement_id)
    .eq('active', true)
    .maybeSingle();

  if (placementError || !placement) {
    res.status(404).json({ error: 'Placement not found or no longer active' });
    return;
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      placement_id,
      status: 'submitted',
      applied_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
}

/**
 * GET /dashboard/stats
 * Returns aggregated activity counts for the authenticated user's dashboard.
 * Source: FR15 (Dashboard tracking)
 */
export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;

  // Run all count queries in parallel for performance
  const [applicationsResult, bookmarksResult, matchesResult, cvResult] = await Promise.all([
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('match_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('cvs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (
    applicationsResult.error ||
    bookmarksResult.error ||
    matchesResult.error ||
    cvResult.error
  ) {
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    return;
  }

  res.json({
    applications_sent: applicationsResult.count ?? 0,
    placements_bookmarked: bookmarksResult.count ?? 0,
    matches_generated: matchesResult.count ?? 0,
    cvs_uploaded: cvResult.count ?? 0,
  });
}
