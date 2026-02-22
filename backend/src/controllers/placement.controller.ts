import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';

export async function getPlacements(req: AuthRequest, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('placements')
    .select('*, companies(name, description, website, logo_url)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}

export async function getPlacementById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('placements')
    .select('*, companies(name, description, website, logo_url)')
    .eq('id', id)
    .single();

  if (error) {
    res.status(404).json({ error: 'Placement not found' });
    return;
  }

  res.json(data);
}

export async function createPlacement(req: AuthRequest, res: Response): Promise<void> {
  const { company_id, role_name, description, location, salary_range, deadline, required_skills, desired_skills } = req.body;

  if (!company_id || !role_name || !description || !location) {
    res.status(400).json({ error: 'company_id, role_name, description, and location are required' });
    return;
  }

  const { data, error } = await supabase
    .from('placements')
    .insert({
      company_id,
      role_name,
      description,
      location,
      salary_range: salary_range ?? null,
      deadline: deadline ?? null,
      required_skills: required_skills ?? [],
      desired_skills: desired_skills ?? [],
      active: true,
    })
    .select('*, companies(name, description, website, logo_url)')
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
}

export async function updatePlacement(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('placements')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, companies(name, description, website, logo_url)')
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}

export async function deletePlacement(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const { error } = await supabase
    .from('placements')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Placement deactivated' });
}
