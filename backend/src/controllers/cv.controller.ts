import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';

export async function uploadCV(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { originalname, buffer, size, mimetype } = req.file;
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(mimetype)) {
    res.status(400).json({ error: 'Only PDF and DOCX files are accepted' });
    return;
  }

  const userId = req.user!.id;
  const ext = originalname.split('.').pop();
  const storagePath = `${userId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

  if (uploadError) {
    res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('cvs').getPublicUrl(storagePath);

  // Save record to cvs table
  const { data, error: dbError } = await supabase
    .from('cvs')
    .insert({
      user_id: userId,
      file_name: originalname,
      file_url: publicUrl,
      file_size: size,
    })
    .select()
    .single();

  if (dbError) {
    res.status(500).json({ error: dbError.message });
    return;
  }

  res.status(201).json(data);
}

export async function getMyCV(req: AuthRequest, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'No CV found' });
    return;
  }

  res.json(data);
}
