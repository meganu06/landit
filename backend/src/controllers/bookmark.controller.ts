import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';

export async function addBookmark(req: AuthRequest, res: Response): Promise<void> {
  const { placementId } = req.params;
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('bookmarks')
    .upsert({ user_id: userId, placement_id: placementId }, { onConflict: 'user_id,placement_id' })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
}

export async function removeBookmark(req: AuthRequest, res: Response): Promise<void> {
  const { placementId } = req.params;
  const userId = req.user!.id;

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('placement_id', placementId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Bookmark removed' });
}

export async function getBookmarks(req: AuthRequest, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      *,
      placements (
        id, role_name, description, location, salary_range, deadline,
        required_skills, desired_skills,
        companies (name, logo_url, website)
      )
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}
