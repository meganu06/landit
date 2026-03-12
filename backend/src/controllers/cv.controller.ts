import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';
import OpenAI from 'openai';
import { anonymize } from '../services/anonymizer.service';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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

export async function extractSkills(req: AuthRequest, res: Response): Promise<void> {
  const { text } = req.body;
  const userId = req.user!.id;

  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    res.status(400).json({ error: 'No CV text provided' });
    return;
  }

  // Anonymize before any LLM sees the text
  const cleanText = anonymize(text);

  // Ask GPT to extract skills from the anonymized CV text
  let extractedNames: string[] = [];
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a CV skill extractor. Extract all technical and professional skills from the CV text provided. ' +
            'Return ONLY a valid JSON array of skill name strings — no explanation, no markdown, just the array. ' +
            'Rules: be specific (e.g. "React" not "web development"), normalise capitalisation (e.g. "JavaScript", "AWS", "PostgreSQL"), ' +
            'include languages, frameworks, tools, cloud platforms, databases, and methodologies, remove duplicates, max 50 skills.',
        },
        { role: 'user', content: cleanText.slice(0, 12000) },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0].message.content?.trim() ?? '[]';
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    extractedNames = JSON.parse(clean);
    if (!Array.isArray(extractedNames)) extractedNames = [];
  } catch (err) {
    res.status(500).json({ error: 'OpenAI extraction failed: ' + (err as Error).message });
    return;
  }

  if (extractedNames.length === 0) {
    res.json({ skills: [] });
    return;
  }

  // For each extracted skill name, find-or-create a row in the skills table
  const skillIds: { id: string; name: string }[] = [];
  for (const name of extractedNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    // Try to find existing skill (case-insensitive)
    const { data: existing } = await supabase
      .from('skills')
      .select('id, name')
      .ilike('name', trimmed)
      .limit(1)
      .maybeSingle();

    if (existing) {
      skillIds.push(existing);
    } else {
      // Create new skill
      const { data: created } = await supabase
        .from('skills')
        .insert({ name: trimmed, category: 'extracted' })
        .select('id, name')
        .single();
      if (created) skillIds.push(created);
    }
  }

  // Upsert all matched skills into student_skills
  if (skillIds.length > 0) {
    const upserts = skillIds.map(s => ({
      user_id: userId,
      skill_id: s.id,
      proficiency_level: 3,
      source: 'cv',
    }));
    await supabase
      .from('student_skills')
      .upsert(upserts, { onConflict: 'user_id,skill_id' });
  }

  res.json({ skills: skillIds });
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
