import { Response } from 'express';
import { supabase } from '../supabase/client';
import { AuthRequest } from '../middleware/auth';
import OpenAI from 'openai';

function getOpenAI() {
return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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
.delete()
.eq('id', id);

if (error) {
res.status(500).json({ error: error.message });
return;
}

res.json({ message: 'Placement deleted' });
}

export async function extractPlacementSkills(req: AuthRequest, res: Response): Promise<void> {
const { description, placementId } = req.body;

if (!description) {
res.status(400).json({ error: 'description is required' });
return;
}

// Ask GPT to extract and classify skills from the description
let extracted: { name: string; importance: 'required' | 'preferred' }[] = [];
try {
const completion = await getOpenAI().chat.completions.create({
model: 'gpt-4o-mini',
messages: [
{
role: 'system',
content:
'You are extracting skills from a job placement description that will be matched against student CVs. ' +
'Return ONLY a valid JSON array of objects with "name" (string) and "importance" ("required" or "preferred") fields. ' +
'Include ALL skills relevant to the role: programming languages, frameworks, libraries, tools, databases, cloud platforms, methodologies (e.g. Agile, TDD), and soft skills (e.g. "Communication", "Teamwork", "Problem Solving"). ' +
'Use "required" for language like "must", "essential", "you will need", "strong experience in". ' +
'Use "preferred" for language like "nice to have", "bonus", "ideally", "a plus", "desirable", "familiarity with". ' +
'When unclear, default to "preferred". Be specific: "React" not "frontend", "PostgreSQL" not "databases". ' +
'No duplicates, max 25 skills. Return ONLY the JSON array, no markdown, no explanation.',
},
{ role: 'user', content: description.slice(0, 8000) },
],
temperature: 0,
});

const raw = completion.choices[0].message.content?.trim() ?? '[]';
const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
extracted = JSON.parse(clean);
if (!Array.isArray(extracted)) extracted = [];
} catch (err) {
res.status(500).json({ error: 'OpenAI extraction failed: ' + (err as Error).message });
return;
}

if (extracted.length === 0) {
res.json({ skills: [] });
return;
}

// If no placementId, just return the extracted skills without persisting
if (!placementId) {
res.json({ skills: extracted });
return;
}

// Delete existing skills for this placement
await supabase.from('placement_skills').delete().eq('placement_id', placementId);

// Find-or-create each skill, then insert into placement_skills
const saved: { name: string; importance: string }[] = [];
for (const { name, importance } of extracted) {
const trimmed = name.trim();
if (!trimmed) continue;

const { data: existing } = await supabase
.from('skills')
.select('id')
.ilike('name', trimmed)
.limit(1)
.maybeSingle();

let skillId = existing?.id;
if (!skillId) {
const { data: created } = await supabase
.from('skills')
.insert({ name: trimmed, category: 'technical' })
.select('id')
.single();
skillId = created?.id;
}

if (skillId) {
await supabase.from('placement_skills').insert({
placement_id: placementId,
skill_id: skillId,
importance: importance === 'required' ? 'required' : 'preferred',
});
saved.push({ name: trimmed, importance });
}
}

res.json({ skills: saved });
}

export async function savePlacementSkillsList(req: AuthRequest, res: Response): Promise<void> {
const { id: placementId } = req.params;
const { required = [], preferred = [] } = req.body;

const all: { name: string; importance: 'required' | 'preferred' }[] = [
...required.map((name: string) => ({ name, importance: 'required' as const })),
...preferred.map((name: string) => ({ name, importance: 'preferred' as const })),
];

await supabase.from('placement_skills').delete().eq('placement_id', placementId);

for (const { name, importance } of all) {
const trimmed = name.trim();
if (!trimmed) continue;

const { data: existing } = await supabase
.from('skills')
.select('id')
.ilike('name', trimmed)
.limit(1)
.maybeSingle();

let skillId = existing?.id;
if (!skillId) {
const { data: created } = await supabase
.from('skills')
.insert({ name: trimmed, category: 'technical' })
.select('id')
.single();
skillId = created?.id;
}

if (skillId) {
await supabase.from('placement_skills').insert({
placement_id: placementId,
skill_id: skillId,
importance,
});
}
}

res.json({ ok: true });
}
